/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
import CharacterData from './character.js';

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
    for (const save of Object.values(data.saves)) {
      const proficiency = save.rank ? (save.rank * 2) + data.details.level.value : 0;
      save.value = data.abilities[save.ability].mod + proficiency + save.item;
      save.breakdown = `${save.ability} modifier(${data.abilities[save.ability].mod}) + proficiency(${proficiency}) + item bonus(${save.item})`;
    }

    // Martial
    for (const skl of Object.values(data.martial)) {
      const proficiency = skl.rank ? (skl.rank * 2) + data.details.level.value : 0;
      skl.value = proficiency;
      skl.breakdown = `proficiency(${proficiency})`;
    }

    // Perception
    const proficiency = data.attributes.perception.rank ? (data.attributes.perception.rank * 2) + data.details.level.value : 0;
    data.attributes.perception.value = data.abilities[data.attributes.perception.ability].mod + proficiency + data.attributes.perception.item;
    data.attributes.perception.breakdown = `${data.attributes.perception.ability} modifier(${data.abilities[data.attributes.perception.ability].mod}) + proficiency(${proficiency}) + item bonus(${data.attributes.perception.item})`;

    // TODO: seems like storing items, feats, armor, actions etc all in one array would be expensive to search? maybe adjust this data model?
    // TODO: speed penalties are not automated
    data.attributes.ac.value = character.ac;
    data.attributes.ac.check = character.skillCheckPenalty;

    // Skill modifiers
    for (const skl of Object.values(data.skills)) {
      // skl.value = parseFloat(skl.value || 0);
      const proficiency = skl.rank ? (skl.rank * 2) + data.details.level.value : 0;
      skl.mod = data.abilities[skl.ability].mod;

      if (skl.armor) {
        const armorCheckPenalty = skl.armor ? (data.attributes.ac.check || 0) : 0;
        skl.value = data.abilities[skl.ability].mod + proficiency + skl.item + armorCheckPenalty;
        skl.breakdown = `${skl.ability} modifier(${data.abilities[skl.ability].mod}) + proficiency(${proficiency}) + item bonus(${skl.item}) + armor check penalty(${armorCheckPenalty})`;
      } else {
        skl.value = data.abilities[skl.ability].mod + proficiency + skl.item;
        skl.breakdown = `${skl.ability} modifier(${data.abilities[skl.ability].mod}) + proficiency(${proficiency}) + item bonus(${skl.item})`;
      }
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
    const parts = ['@mod'];
    const flavor = `${rank} ${CONFIG.PF2E.skills[skillName]} Skill Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: { mod: skl.value },
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
    
    if (flatCheck.result == 20 || flatCheck.result >= (recoveryDc+10)) {
      result = game.i18n.localize("PF2E.CritSuccess") + ' ' + game.i18n.localize("PF2E.Recovery.critSuccess");
    } else if (flatCheck.result == 1 || flatCheck.result <= (recoveryDc-10)) {
      result = game.i18n.localize("PF2E.CritFailure") + ' ' + game.i18n.localize("PF2E.Recovery.critFailure");
    } else if (flatCheck.result >= recoveryDc) {
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
          <span style="font-size: 12px; font-style:oblique; font-weight: 100;">
            ${rollingPartA}  <a class="inline-roll inline-result" title="d20" data-roll="${escape(JSON.stringify(flatCheck))}" style="font-style: normal;">
            <i class="fas fa-dice-d20"></i> ${flatCheck.result}</a> ${rollingPartB} ${dc}.
          </span>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-weight: 100;">
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
    const parts = ['@mod'];
    const flavor = `${item.name} Skill Check`;
    const i = item.data;

    const proficiency = (i.data.proficient || {}).value ? ((i.data.proficient || {}).value * 2) + this.data.data.details.level.value : 0;
    const modifier = this.data.data.abilities.int.mod;
    const itemBonus = Number((i.data.item || {}).value || 0);
    let rollMod = modifier + proficiency + itemBonus;
    // Override roll calculation if this is an NPC "lore" skill
    if (item.actor && item.actor.data && item.actor.data.type === 'npc') {
      rollMod = i.data.mod.value;
    }

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: { mod: rollMod },
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
    const parts = ['@mod'];
    const flavor = `${CONFIG.PF2E.saves[saveName]} Save Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: { mod: save.value },
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
    const parts = ['@mod'];
    const flavor = `${game.i18n.localize("PF2E.PerceptionLabel")} Check`;

    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: { mod: skl.value },
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
              <span style="font-size: 12px; font-style:oblique; font-weight: 100; line-height: 15px;">
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
          <span style="font-size: 12px; font-style:oblique; font-weight: 100;">${combatant.name}'s Initiative is now ${value} !</span>
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
    const current = getProperty(this.data.data, attribute);

    if ( attribute == 'attributes.hp' ) {
      if (isDelta) {
        if (value < 0) {
          if ((current.temp + value) >= 0) {
            const newTempHp = current.temp + value;
            this.update({[`data.attributes.hp.temp`]: newTempHp});
            value = 0;
          } else {
            value = current.temp + value;
            this.update({[`data.attributes.hp.temp`]: 0});
          }
          if (game.settings.get('pf2e', 'staminaVariant') > 0 && value < 0) {
            const currentSP = getProperty(this.data.data, 'attributes.sp');

            if ((currentSP.value + value) >= 0) {
              const newSP = currentSP.value + value;
              this.update({[`data.attributes.sp.value`]: newSP});
              value = 0;
            } else {
              value = currentSP.value + value;
              this.update({[`data.attributes.sp.value`]: 0});
            }
          }
        }
        value = Math.clamped(0, Number(current.value) + value, current.max);
      }
      value = Math.clamped(value, 0, current.max);
      return this.update({[`data.attributes.hp.value`]: value});

    } else if ( attribute == 'attributes.shield' && isDelta ) {

      if (isDelta) {
        if (value < 0) {
          value = Math.min( (current.hardness + value) , 0); //value is now a negative modifier (or zero), taking into account hardness
          const hp = this.data.data.attributes.hp;
          if (value < 0) { //substract the value from (temp)HP as well 
            if ((hp.temp + value) >= 0) {
              const newTempHp = hp.temp + value;
              this.update({[`data.attributes.hp.temp`]: newTempHp});
            } else {
              const newHp = Math.clamped( ( hp.value + hp.temp + value ), 0, hp.max);
              this.update({[`data.attributes.hp.value`]: newHp});
              this.update({[`data.attributes.hp.temp`]: 0});
            }
          }
        }
        value = Number(current.value) + value; //apply modifier to shield hp
      }
      value = Math.clamped(value, 0, current.max);
      return this.update({[`data.attributes.shield.value`]: value});

    }

    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

}

Handlebars.registerHelper('if_stamina', function(options) {
  if(game.settings.get('pf2e', 'staminaVariant') > 0) {
    return options.fn(this);
  } else {
    return ''
  }
});