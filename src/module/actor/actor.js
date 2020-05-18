/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
import CharacterData from './character.js';
import {
  DEXTERITY, WISDOM,
  AbilityModifier, ProficiencyModifier, PF2ModifierType, PF2Modifier, PF2StatisticModifier,
} from '../modifiers.js';
import { ConditionModifiers } from '../condition-modifiers.js';

export default class extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Actor's data object
    const actorData = this.data;
    const { data } = actorData;
    this._prepareTokenImg();

    // Ability modifiers
    if (actorData.type === 'npc') {
      for (const abl of Object.values(data.abilities)) {
        if (!abl.mod) abl.mod = 0;
        abl.value = abl.mod * 2 + 10;
      }
    } else {
      for (const abl of Object.values(data.abilities)) {
        abl.mod = Math.floor((abl.value - 10) / 2);
      }
    }

    // Prepare Character data
    if (actorData.type === 'character') this._prepareCharacterData(data);
    else if (actorData.type === 'npc') this._prepareNPCData(data);

    // TODO: Migrate trait storage format
    const map = {
      dr: CONFIG.PF2E.damageTypes,
      di: CONFIG.PF2E.damageTypes,
      dv: CONFIG.PF2E.damageTypes,
      ci: CONFIG.PF2E.conditionTypes,
      languages: CONFIG.PF2E.languages,
    };
    for (const [t, choices] of Object.entries(map)) {
      const trait = data.traits[t];
      if (!(trait.value instanceof Array)) {
        trait.value = TraitSelector5e._backCompat(trait.value, choices);
      }
    }

    // Return the prepared Actor data
    return actorData;
  }

  _prepareTokenImg() {
    if (game.settings.get('pf2e', 'defaultTokenSettings')) {
      if (this.data.token.img == 'icons/svg/mystery-man.svg' && this.data.token.img != this.img) {
        this.data.token.img = this.img;
      }
    }

  }

  /* -------------------------------------------- */

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(data) {
    const character = new CharacterData(data, this.items);

    // this will most likely also relevant for NPCs
    const statisticsModifiers = {};

    // calculate modifiers for conditions (from status effects)
    data.statusEffects?.forEach((effect) => ConditionModifiers.addStatisticModifiers(statisticsModifiers, effect));

    // Level, experience, and proficiency
    data.details.level.value = character.level;
    data.details.xp.max = character.maxExp;
    data.details.xp.pct = character.xpPercent;

    // Calculate HP and SP
    const bonusHpPerLevel = data.attributes.levelbonushp * data.details.level.value;
    if (game.settings.get('pf2e', 'staminaVariant')) {
      const bonusSpPerLevel = data.attributes.levelbonussp * data.details.level.value;
      const halfClassHp = Math.floor(data.attributes.classhp / 2);

      data.attributes.sp.max = (halfClassHp + data.abilities.con.mod) * data.details.level.value
        + bonusSpPerLevel
        + data.attributes.flatbonussp;

      data.attributes.hp.max = data.attributes.ancestryhp +
        (halfClassHp*data.details.level.value)
        + data.attributes.flatbonushp
        + bonusHpPerLevel;
    } else {
      data.attributes.hp.max = data.attributes.ancestryhp
        + ((data.attributes.classhp + data.abilities.con.mod) * data.details.level.value)
        + bonusHpPerLevel
        + data.attributes.flatbonushp;
    }

    // Saves
    for (const [saveName, save] of Object.entries(data.saves)) {
      const modifiers = [
        AbilityModifier.fromAbilityScore(save.ability, data.abilities[save.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, save.rank),
      ];
      if (save.item) {
        modifiers.push(new PF2Modifier('Item Bonus', save.item, PF2ModifierType.ITEM));
      }
      [saveName, `${save.ability}-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).forEach((m) => modifiers.push(m));
      });

      // preserve backwards-compatibility
      let updated;
      if (save instanceof PF2StatisticModifier) {
        // calculate and override fields in PF2StatisticModifier, like the list of modifiers and the
        // total modifier
        updated = mergeObject(save, new PF2StatisticModifier(saveName, modifiers));
      } else {
        // ensure the individual saving throw objects has the correct prototype, while retaining the
        // original data fields
        updated = mergeObject(new PF2StatisticModifier(saveName, modifiers), save);
      }
      updated.breakdown = updated.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      updated.value = updated.totalModifier;
      data.saves[saveName] = updated; // eslint-disable-line no-param-reassign
    }

    // Martial
    for (const skl of Object.values(data.martial)) {
      const proficiency = skl.rank ? (skl.rank * 2) + data.details.level.value : 0;
      skl.value = proficiency;
      skl.breakdown = `proficiency(${proficiency})`;
    }

    // Perception
    {
      const modifiers = [
        WISDOM.withScore(data.abilities.wis.value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.attributes.perception.rank || 0),
      ];
      if (data.attributes.perception.item) {
        modifiers.push(new PF2Modifier('Item Bonus', data.attributes.perception.item, PF2ModifierType.ITEM));
      }
      ['perception', `wis-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).forEach((m) => modifiers.push(m));
      });

      // preserve backwards-compatibility
      /* eslint-disable no-param-reassign */
      if (data.attributes.perception instanceof PF2StatisticModifier) {
        // calculate and override fields in PF2StatisticModifier, like the list of modifiers and the total modifier
        data.attributes.perception = mergeObject(data.attributes.perception, new PF2StatisticModifier('perception', modifiers));
      } else {
        // ensure the perception object has the correct prototype, while retaining the original data fields
        data.attributes.perception = mergeObject(new PF2StatisticModifier('perception', modifiers), data.attributes.perception);
      }
      data.attributes.perception.breakdown = data.attributes.perception.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      data.attributes.perception.value = data.attributes.perception.totalModifier;
      /* eslint-enable */
    }

    // Class DC
    {
      const modifiers = [
        AbilityModifier.fromAbilityScore(data.details.keyability.value, data.abilities[data.details.keyability.value].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.attributes.classDC.rank ?? 0),
      ];
      ['class', `${data.details.keyability.value}-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).forEach((m) => modifiers.push(m));
      });

      // preserve backwards-compatibility
      /* eslint-disable no-param-reassign */
      if (data.attributes.classDC instanceof PF2StatisticModifier) {
        // calculate and override fields in PF2StatisticModifier, like the list of modifiers and the total modifier
        data.attributes.classDC = mergeObject(data.attributes.classDC, new PF2StatisticModifier('PF2E.ClassDCLabel', modifiers));
      } else {
        // ensure the perception object has the correct prototype, while retaining the original data fields
        data.attributes.classDC = mergeObject(new PF2StatisticModifier('PF2E.ClassDCLabel', modifiers), data.attributes.classDC);
      }
      data.attributes.classDC.value = 10 + data.attributes.classDC.totalModifier;
      data.attributes.classDC.ability = data.details.keyability.value;
      data.attributes.classDC.breakdown = [game.i18n.localize('PF2E.ClassDCBase')].concat(
        data.attributes.classDC.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');
      /* eslint-enable */
    }

    // Armor Class
    {
      const modifiers = [];
      let armorCheckPenalty = 0;
      // find equipped armor
      const worn = this.data.items.filter((item) => item.type === 'armor')
        .filter((armor) => armor.data.armorType.value !== 'shield')
        .find((armor) => armor.data.equipped.value);
      if (worn) {
        // Dex modifier limited by armor max dex bonus
        const dexterity = DEXTERITY.withScore(data.abilities.dex.value);
        dexterity.modifier = Math.min(dexterity.modifier, Number(worn.data.dex.value ?? 0));
        modifiers.push(dexterity);

        // armor check penalty
        if (data.abilities.str.value < Number(worn.data.strength.value ?? 0)) {
          armorCheckPenalty = Number(worn.data.check.value ?? 0);
        }

        modifiers.push(ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.martial[worn.data.armorType?.value]?.rank ?? 0));
        modifiers.push(new PF2Modifier(worn.name, Number(worn.data.armor.value ?? 0), PF2ModifierType.ITEM));
      } else {
        modifiers.push(DEXTERITY.withScore(data.abilities.dex.value));
        modifiers.push(ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.martial.unarmored.rank));
      }
      // condition modifiers
      ['ac', 'dex-based', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).forEach((m) => modifiers.push(m));
      });

      /* eslint-disable no-param-reassign */
      data.attributes.ac = new PF2StatisticModifier("Armor Class", modifiers);
      // preserve backwards-compatibility
      data.attributes.ac.value = 10 + data.attributes.ac.totalModifier;
      data.attributes.ac.check = armorCheckPenalty;
      data.attributes.ac.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')].concat(
        data.attributes.ac.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');
      /* eslint-enable */
    }

    // Skill modifiers
    for (const [skillName, skill] of Object.entries(data.skills)) {
      const modifiers = [
        AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
      ];
      if (skill.item) {
        modifiers.push(new PF2Modifier('Item Bonus', skill.item, PF2ModifierType.ITEM));
      }
      if (skill.armor && data.attributes.ac.check && data.attributes.ac.check < 0) {
        modifiers.push(new PF2Modifier('PF2E.ArmorCheckPenalty', data.attributes.ac.check, PF2ModifierType.UNTYPED));
      }

      // workaround for the shortform skill names
      const skillDictionary = {acr:'acrobatics',arc:'arcana',ath:'athletics',cra:'crafting',
        dec:'deception',dip:'diplomacy',itm:'intimidate',med:'medicine',nat:'nature',occ:'occultism',
        prf:'perform',rel:'religion',soc:'society',ste:'stealth',sur:'survival',thi:'thievery'};
      const expandedName = skillDictionary[skillName];

      [expandedName, `${skill.ability}-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).forEach((m) => modifiers.push(m));
      });

      // preserve backwards-compatibility
      let updated;
      if (skill instanceof PF2StatisticModifier) {
        // calculate and override fields in PF2StatisticModifier, like the list of modifiers and the total modifier
        updated = mergeObject(skill, new PF2StatisticModifier(expandedName, modifiers));
      } else {
        // ensure the individual skill objects has the correct prototype, while retaining the original data fields
        updated = mergeObject(new PF2StatisticModifier(expandedName, modifiers), skill);
      }
      updated.breakdown = updated.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      updated.value = updated.totalModifier;
      data.skills[skillName] = updated; // eslint-disable-line no-param-reassign
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  _prepareNPCData(data) {
    // As we only capture the NPCs Spell DC attribute, we need to calculate the Spell Attack Roll.
    // see sidebar on p298 of pf2e core rulebook.

    //data.attributes.spelldc.value = data.attributes.spelldc.dc - 10;
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Roll a Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSkill(event, skillName) {
    const skl = this.data.data.skills[skillName];
    const rank = CONFIG.PF2E.proficiencyLevels[skl.rank];
    const parts = ['@mod', '@itemBonus'];
    const flavor = `${rank} ${CONFIG.PF2E.skills[skillName]} Skill Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: {
        mod: skl.value - skl.item,
        itemBonus: skl.item
      },
      title: flavor,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }

  /**
   * Roll a Recovery Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollRecovery(event) {
    const dying = this.data.data.attributes.dying.value;
    // const wounded = this.data.data.attributes.wounded.value; // not needed currently as the result is currently not automated
    const recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
    const recoveryDc = 10 + recoveryMod;
    const flatCheck = new Roll("1d20").roll();
    const dc = recoveryDc + dying;
    let result = '';

    if (flatCheck.result == 20 || flatCheck.result >= (dc+10)) {
      result = game.i18n.localize("PF2E.CritSuccess") + ' ' + game.i18n.localize("PF2E.Recovery.critSuccess");
    } else if (flatCheck.result == 1 || flatCheck.result <= (dc-10)) {
      result = game.i18n.localize("PF2E.CritFailure") + ' ' + game.i18n.localize("PF2E.Recovery.critFailure");
    } else if (flatCheck.result >= dc) {
      result = game.i18n.localize("PF2E.Success") + ' ' + game.i18n.localize("PF2E.Recovery.success");
    } else {
      result = game.i18n.localize("PF2E.Failure") + ' ' + game.i18n.localize("PF2E.Recovery.failure");
    }
    const dyingName = game.i18n.localize("PF2E.condition.dying.name").toLowerCase();
    const rollingPartA = game.i18n.localize("PF2E.Recovery.rollingPartA");
    const rollingPartB = game.i18n.localize("PF2E.Recovery.rollingPartB");

    const message = `
      <div class="dice-roll">
      <div class="dice-result">
        <div class="dice-tooltip" style="display: none;">
            <section class="tooltip-part">
              <p class="part-formula" style="padding-top:5px;">${flatCheck.formula}<span class="part-total">${flatCheck.result}</span></p>
              <p class="dice-rolls" style="padding-left: 3px;">DC ${recoveryDc} + ${dyingName} ${dying}</p>
            </section>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-style:oblique; font-weight: 400;">
            ${rollingPartA}  <a class="inline-roll inline-result" title="d20" data-roll="${escape(JSON.stringify(flatCheck))}" style="font-style: normal;">
            <i class="fas fa-dice-d20"></i> ${flatCheck.result}</a> ${rollingPartB} ${dc}.
          </span>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-weight: 400;">
            ${result}
          </span>
        </div>
      </div>
      </div>
      `;
      ChatMessage.create({
        user: game.user._id,
        speaker: { actor: this },
        content: message,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      // No automated update yet, not sure if Community wants that.
      // return this.update({[`data.attributes.dying.value`]: dying}, [`data.attributes.wounded.value`]: wounded});
  }

  /* -------------------------------------------- */

  /**
   * Roll a Lore (Item) Skill Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollLoreSkill(event, item) {
    const parts = ['@mod', '@itemBonus'];
    const flavor = `${item.name} Skill Check`;
    const i = item.data;

    const proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + this.data.data.details.level.value : 0;
    const modifier = this.data.data.abilities.int.mod;
    const itemBonus = Number((i.data.item || {}).value || 0);
    let rollMod = modifier + proficiency;
    // Override roll calculation if this is an NPC "lore" skill
    if (item.actor && item.actor.data && item.actor.data.type === 'npc') {
      rollMod = i.data.mod.value;
    }

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: {
        mod: rollMod,
        itemBonus: itemBonus
      },
      title: flavor,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }

  /* -------------------------------------------- */
  /**
   * Roll a Save Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollSave(event, saveName) {
    const save = this.data.data.saves[saveName];
    const parts = ['@mod', '@itemBonus'];
    const flavor = `${CONFIG.PF2E.saves[saveName]} Save Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: {
        mod: save.value - save.item,
        itemBonus: save.item
      },
      title: flavor,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }

  /**
   * Roll an Ability Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollAbility(event, abilityName) {
    const skl = this.data.data.abilities[abilityName];
    const parts = ['@mod'];
    const flavor = `${CONFIG.PF2E.abilities[abilityName]} Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: { mod: skl.mod },
      title: flavor,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Attribute Check
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param skill {String}    The skill id
   */
  rollAttribute(event, attributeName) {
    const skl = this.data.data.attributes[attributeName];
    const parts = ['@mod', '@itemBonus'];
    const flavor = `${game.i18n.localize("PF2E.PerceptionLabel")} Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: {
        mod: skl.value - skl.item,
        itemBonus: skl.item
      },
      title: flavor,
      speaker: ChatMessage.getSpeaker({ actor: this }),
    });
  }


  /* -------------------------------------------- */

  /**
   * Apply rolled dice damage to the token or tokens which are currently controlled.
   * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
   *
   * @param {HTMLElement} roll    The chat entry which contains the roll data
   * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
   * @return {Promise}
   */
  static async applyDamage(roll, multiplier, attribute='attributes.hp', modifier=0) {
    if (canvas.tokens.controlled.length > 0) {
      const value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier) + modifier;
      const messageSender = roll.find('.message-sender').text();
      const flavorText = roll.find('.flavor-text').text();
      const shieldFlavor = (attribute=='attributes.shield') ? game.i18n.localize("PF2E.UI.applyDamage.shieldActive") : game.i18n.localize("PF2E.UI.applyDamage.shieldInActive");
      for (const t of canvas.tokens.controlled) {
        const a = t.actor;

        const appliedResult = (value>0) ? game.i18n.localize("PF2E.UI.applyDamage.damaged") + value : game.i18n.localize("PF2E.UI.applyDamage.healed") + value*-1;
        const modifiedByGM = modifier!==0 ? 'Modified by GM: '+(modifier<0?'-':'+')+modifier : '';
        const by = game.i18n.localize("PF2E.UI.applyDamage.by");
        const hitpoints = game.i18n.localize("PF2E.HitPointsHeader").toLowerCase();
        const message = `
          <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-tooltip dmg-tooltip" style="display: none;">
              <div class="dice-formula" style="background: 0;">
                <span>${flavorText}, ${by} ${messageSender}</span>
                <span>${modifiedByGM}</span>
              </div>
            </div>
            <div class="dice-total" style="padding: 0 10px; word-break: normal;">
              <span style="font-size: 12px; font-style:oblique; font-weight: 400; line-height: 15px;">
                ${t.name} ${shieldFlavor} ${appliedResult} ${hitpoints}.
              </span>
            </div>
          </div>
          </div>
          `;

        const succeslyApplied = await t.actor.modifyTokenAttribute(attribute, value*-1, true, true);
        if (succeslyApplied ) {
          ChatMessage.create({
            user: game.user._id,
            speaker: { alias: t.name },
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
          });
        }
      }
    } else {
      ui.notifications.error(game.i18n.localize("PF2E.UI.errorTargetToken"));
      return false;
    }
    return true;
  }

  /**
   * Set initiative for the combatant associated with the selected token or tokens with the rolled dice total.
   *
   * @param {HTMLElement} roll    The chat entry which contains the roll data
   * @return {Promise}
   */
  static async setCombatantInitiative(roll) {
    const skillRolled = roll.find('.flavor-text').text();
    const valueRolled = parseFloat(roll.find('.dice-total').text());
    let value = valueRolled;
    const promises = [];
    for (const t of canvas.tokens.controlled) {
      if (!game.combat) {
        ui.notifications.error("No active encounters in the Combat Tracker.");
        return;
      }
      const combatant = game.combat.getCombatantByToken(t.id);
      if(combatant == undefined) {
        ui.notifications.error("You haven't added this token to the Combat Tracker.");
        return;
      }
      const initBonus = combatant.actor.data.data.attributes.initiative.circumstance + combatant.actor.data.data.attributes.initiative.status;
      value += initBonus;
      const message = `
      <div class="dice-roll">
      <div class="dice-result">
        <div class="dice-tooltip" style="display: none;">
            <div class="dice-formula" style="background: 0;">
              <span style="font-size: 10px;">${skillRolled} <span style="font-weight: bold;">${valueRolled}</span> + ${initBonus}</span>
            </div>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-style:oblique; font-weight: 400;">${combatant.name}'s Initiative is now ${value} !</span>
        </div>
      </div>
      </div>
      `;
      ChatMessage.create({
        user: game.user._id,
        speaker: { alias: t.name },
        content: message,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      promises.push(
        game.combat.setInitiative(combatant._id, value),
      );
    }
    return Promise.all(promises);
  }

  /* -------------------------------------------- */
  /* Owned Item Management
  /* -------------------------------------------- */

  /**
   * This method extends the base importItemFromCollection functionality provided in the base actor entity
   *
   * Import a new owned Item from a compendium collection
   * The imported Item is then added to the Actor as an owned item.
   *
   * @param collection {String}     The name of the pack from which to import
   * @param entryId {String}        The ID of the compendium entry to import
   */
  importItemFromCollection(collection, entryId, location) {
    // if location parameter missing, then use the super method
    if (location == null) {
      console.log('PF2e | importItemFromCollection: ', entryId);
      super.importItemFromCollection(collection, entryId);
      return;
    }

    const pack = game.packs.find(p => p.collection === collection);
    if (pack.metadata.entity !== "Item") return;
    return pack.getEntity(entryId).then(ent => {
      console.log(`${vtt} | Importing Item ${ent.name} from ${collection}`);
      if (ent.type === 'spell') {
        ent.data.data.location = {
          value: location,
        };
      }
      delete ent.data._id;
      return this.createOwnedItem(ent.data);
    });

  }

    /* -------------------------------------------- */

  /**
   * Handle how changes to a Token attribute bar are applied to the Actor.
   * This allows for game systems to override this behavior and deploy special logic.
   * @param {string} attribute    The attribute path
   * @param {number} value        The target attribute value
   * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
   * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
   * @return {Promise}
   */
  async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
    const hp = this.data.data.attributes.hp;
    const sp = this.data.data.attributes.sp;

    if ( attribute === 'attributes.shield') {
      const shield = this.data.data.attributes.shield;
      if (isDelta && value < 0) {
        value = Math.min( (shield.hardness + value) , 0); //value is now a negative modifier (or zero), taking into account hardness
        this.update({[`data.attributes.shield.value`]: Math.clamped(0, shield.value + value, shield.max)});
        attribute = 'attributes.hp';
      }
    }

    if (attribute === 'attributes.hp') {
      if (isDelta) {
        if (value < 0) {
          value = this.calculateHealthDelta({hp, sp, delta: value})
        }
        value = Math.clamped(0, Number(hp.value) + value, hp.max);
      }
      value = Math.clamped(value, 0, hp.max);
      return this.update({[`data.attributes.hp.value`]: value});
    }

    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  /**
   * Handle how changes to a Token attribute bar are applied to the Actor.
   * This allows for game systems to override this behavior and deploy special logic.
   * @param {object} args   Contains references to the hp, and sp objects.
   */
  calculateHealthDelta(args) {
    let {hp, sp, delta} = args;
    if ((hp.temp + delta) >= 0) {
      const newTempHp = hp.temp + delta;
      this.update({[`data.attributes.hp.temp`]: newTempHp});
      delta = 0;
    } else {
      delta = hp.temp + delta;
      this.update({[`data.attributes.hp.temp`]: 0});
    }
    if (game.settings.get('pf2e', 'staminaVariant') > 0 && delta < 0) {
      if ((sp.value + delta) >= 0) {
        const newSP = sp.value + delta;
        this.update({[`data.attributes.sp.value`]: newSP});
        delta = 0;
      } else {
        delta = sp.value + delta;
        this.update({[`data.attributes.sp.value`]: 0});
      }
    }
    return delta;
  }
}

Handlebars.registerHelper('if_stamina', function(options) {
  if(game.settings.get('pf2e', 'staminaVariant') > 0) {
    return options.fn(this);
  } else {
    return ''
  }
});
