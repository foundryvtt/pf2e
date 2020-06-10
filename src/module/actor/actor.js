/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
import CharacterData from './character.js';
import {
    AbilityModifier,
    DEXTERITY,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from '../modifiers.js';
import { ConditionModifiers } from '../condition-modifiers.js';
import { PF2WeaponDamage } from '../system/damage/weapon.js';
import { PF2Check, PF2DamageRoll } from '../system/rolls.js';
import { getArmorBonus, getAttackBonus, getResiliencyBonus } from '../item/runes.js';

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
    } else if (actorData.type == 'character') {
      for (const abl of Object.values(data.abilities)) {
        abl.mod = Math.floor((abl.value - 10) / 2);
      }
    }

    // Prepare Character data
    if (actorData.type === 'character') this._prepareCharacterData(actorData);
    else if (actorData.type === 'npc') this._prepareNPCData(data);


    if (data.traits !== undefined) {
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
        if (trait == undefined) continue;
        if (!(trait.value instanceof Array)) {
          trait.value = TraitSelector5e._backCompat(trait.value, choices);
        }
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
  _prepareCharacterData(actorData) {
    const {data} = actorData;
    const character = new CharacterData(data, this.items);

    // this will most likely also relevant for NPCs
    const statisticsModifiers = {};

    // custom modifiers
    data.customModifiers = data.customModifiers ?? {}; // eslint-disable-line no-param-reassign
    for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
      statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifiers); // eslint-disable-line no-param-reassign
    }

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
    const worn = this.getFirstWornArmor();
    for (const [saveName, save] of Object.entries(data.saves)) {
      const modifiers = [
        AbilityModifier.fromAbilityScore(save.ability, data.abilities[save.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, save.rank),
      ];
      if (worn) {
          const resiliencyBonus = getResiliencyBonus(worn.data);
          if (resiliencyBonus > 0) {
              modifiers.push(new PF2Modifier(worn.name, resiliencyBonus, PF2ModifierType.ITEM));
          }
      }
      if (save.item) {
        modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', Number(save.item), PF2ModifierType.ITEM));
      }
      [saveName, `${save.ability}-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
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
      updated.roll = (event) => {
        const label = game.i18n.format('PF2E.SavingThrowWithName', { saveName: game.i18n.localize(CONFIG.saves[saveName]) });
        PF2Check.roll(new PF2CheckModifier(label, updated), { type: 'saving-throw' }, event);
      };
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
        modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', Number(data.attributes.perception.item), PF2ModifierType.ITEM));
      }
      ['perception', `wis-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
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
      data.attributes.perception.roll = (event) => {
        const label = game.i18n.localize('PF2E.PerceptionCheck');
        PF2Check.roll(new PF2CheckModifier(label, data.attributes.perception), { type: 'perception-check' }, event);
      };
      /* eslint-enable */
    }

    // Class DC
    {
      const modifiers = [
        AbilityModifier.fromAbilityScore(data.details.keyability.value, data.abilities[data.details.keyability.value].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.attributes.classDC.rank ?? 0),
      ];
      ['class', `${data.details.keyability.value}-based`, 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
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
        modifiers.push(new PF2Modifier(worn.name, getArmorBonus(worn.data), PF2ModifierType.ITEM));
      } else {
        modifiers.push(DEXTERITY.withScore(data.abilities.dex.value));
        modifiers.push(ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.martial.unarmored.rank));
      }
      // condition modifiers
      ['ac', 'dex-based', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      /* eslint-disable no-param-reassign */
      data.attributes.ac = new PF2StatisticModifier("ac", modifiers);
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
    const feats = new Set(actorData.items
      .filter(item => item.type === 'feat')
      .map(item => item.name))

    const hasUntrainedImprovisation = feats.has('Untrained Improvisation')

    for (const [skillName, skill] of Object.entries(data.skills)) {
      const modifiers = [
        AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
      ];
      if(skill.rank === 0 && hasUntrainedImprovisation) {
        let bonus = data.details.level.value < 7 ? Math.floor(data.details.level.value / 2) : data.details.level.value
        modifiers.push(new PF2Modifier('PF2E.ProficiencyLevelUntrainedImprovisation', bonus, PF2ModifierType.PROFICIENCY))
      }
      if (skill.item) {
        modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', skill.item, PF2ModifierType.ITEM));
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
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
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
      updated.roll = (event) => {
        const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: game.i18n.localize(CONFIG.skills[skillName]) });
        PF2Check.roll(new PF2CheckModifier(label, updated), { type: 'skill-check' }, event);
      };
      data.skills[skillName] = updated; // eslint-disable-line no-param-reassign
    }

    // Automatic Actions
    data.actions = []; // eslint-disable-line no-param-reassign

    // Strikes
    {
      // collect the weapon proficiencies
      const proficiencies = {
        simple: { name: 'Simple', rank: data?.martial?.simple?.rank ?? 0 },
        martial: { name: 'Martial', rank: data?.martial?.martial?.rank ?? 0 },
        advanced: { name: 'Advanced', rank: data?.martial?.advanced?.rank ?? 0 },
        unarmed: { name: 'Unarmed', rank: data?.martial?.unarmed?.rank ?? 0 },
      };
      (actorData.items ?? []).filter((item) => item.type === 'martial').forEach((item) => {
        proficiencies[item._id] = {
          name: item.name,
          rank: Number(item?.data?.proficient?.value ?? 0),
        };
      });

      // always append unarmed strike
      const unarmed = {
        name: game.i18n.localize('PF2E.Strike.Fist.Label'),
        type: 'weapon',
        img: 'data:image/png;base64,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',
        data: {
          ability: { value: 'str' },
          weaponType: { value: 'unarmed' },
          bonus: { value: 0 },
          map2: -4,
          map3: -8,
          damage: { dice: 1, die: 'd4' },
          range: { value: 'melee' },
          traits: { value: ['agile', 'finesse', 'nonlethal', 'unarmed'] },
        }
      };

      // powerful fist
      if ((actorData.items ?? []).some(i => i.type === 'feat' && i.name === 'Powerful Fist')) {
        unarmed.data.damage.die = 'd6';
      }

      (actorData.items ?? []).concat([unarmed]).filter((item) => item.type === 'weapon').forEach((item) => {
        const modifiers = [];
        {
          let ability = item.data.ability?.value ?? 'str'; // default to Str
          let score = data.abilities[item.data.ability.value]?.value ?? 0;
          // naive check for finesse, which should later be changed to take conditions like
          // enfeebled and clumsy into consideration
          if ((item.data.traits?.value || []).includes('finesse') && data.abilities.dex.mod > data.abilities[ability].mod) {
            ability = 'dex';
            score = data.abilities.dex.value;
          }
          modifiers.push(AbilityModifier.fromAbilityScore(ability, score));
        }
        modifiers.push(ProficiencyModifier.fromLevelAndRank(data.details.level.value, proficiencies[item.data.weaponType.value]?.rank ?? 0));

        const attackBonus = getAttackBonus(item.data);
          if (attackBonus !== 0) {
              modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', attackBonus, PF2ModifierType.ITEM));
          }
        ['attack', `${item.data.ability.value}-attack`, `${item.data.ability.value}-based`, 'all'].forEach((key) => {
          (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
        });
        const action = new PF2StatisticModifier(item.name, modifiers);
        action.imageUrl = item.img;
        action.glyph = 'A';
        action.type = 'strike';
        const flavor = this.getStrikeDescription(item);
        action.description = flavor.description;
        action.criticalSuccess = flavor.criticalSuccess;
        action.success = flavor.success;
        action.traits = [{ name: 'attack', label: game.i18n.localize('PF2E.TraitAttack') }].concat(
          this.constructor.traits(item?.data?.traits?.value).map((trait) => {
            const key = CONFIG.weaponTraits[trait] ?? trait;
            return { name: trait, label: game.i18n.localize(key) };
          })
        );
        action.breakdown = action.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
          .join(', ');
        // amend strike with a roll property
        action.attack = (event) => {
          PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action), { type: 'attack-roll' }, event);
        };
        action.roll = action.attack;
        action.variants = [
          {
            label: `Strike ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
            roll: (event) =>  PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action), { type: 'attack-roll' }, event)
          },
          {
            label: `MAP ${item.data.map2}`,
            roll: (event) =>  PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action, [new PF2Modifier('Multiple Attack Penalty', item.data.map2, PF2ModifierType.UNTYPED)]), { type: 'attack-roll' }, event)
          },
          {
            label: `MAP ${item.data.map3}`,
            roll: (event) =>  PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action, [new PF2Modifier('Multiple Attack Penalty', item.data.map3, PF2ModifierType.UNTYPED)]), { type: 'attack-roll' }, event)
          },
        ];
        const damage = PF2WeaponDamage.calculate(item, actorData, action.traits, statisticsModifiers);
        action.damage = (event, options = []) => {
          PF2DamageRoll.roll(damage, { type: 'damage-roll', outcome: 'success', options }, event);
        };
        action.critical = (event, options = []) => {
          PF2DamageRoll.roll(damage, { type: 'damage-roll', outcome: 'criticalSuccess', options }, event);
        };
        data.actions.push(action);
      });
    }
      this.prepareInitiative(data, actorData, statisticsModifiers);
  }

    prepareInitiative(data, actorData, statisticsModifiers) {
        // Initiative
        const initSkill = data.attributes?.initiative?.ability || 'perception';
        const initModifiers = [];
        // FIXME: this is hard coded for now
        const feats = new Set(actorData.items
            .filter(item => item.type === 'feat')
            .map(item => item.name));
        if (feats.has('Incredible Initiative')) {
            initModifiers.push(new PF2Modifier('Incredible Initiative', 2, PF2ModifierType.CIRCUMSTANCE));
        }
        if (feats.has('Battlefield Surveyor') && initSkill === 'perception') {
          initModifiers.push(new PF2Modifier('Battlefield Surveyor', 2, PF2ModifierType.CIRCUMSTANCE));
        }
        if (feats.has('Elven Instincts') && initSkill === 'perception') {
            initModifiers.push(new PF2Modifier('Elven Instincts', 2, PF2ModifierType.CIRCUMSTANCE));
        }
        if (feats.has('Eye of Ozem') && initSkill === 'perception') {
            initModifiers.push(new PF2Modifier('Eye of Ozem', 2, PF2ModifierType.CIRCUMSTANCE));
        }
        if (feats.has('Harmlessly Cute') && initSkill === 'dec') {
            initModifiers.push(new PF2Modifier('Harmlessly Cute', 1, PF2ModifierType.CIRCUMSTANCE));
        }
        ['initiative'].forEach((key) => {
            (statisticsModifiers[key] || [])
                .map((m) => duplicate(m))
                .forEach((m) => initModifiers.push(m));
        });
        const initValues = initSkill === 'perception' ? data.attributes.perception : data.skills[initSkill];
        const skillName = game.i18n.localize(initSkill === 'perception' ? 'PF2E.PerceptionLabel' : CONFIG.skills[initSkill]);
        data.attributes.initiative = new PF2CheckModifier('initiative', initValues, initModifiers);
        data.attributes.initiative.ability = initSkill;
        data.attributes.initiative.label = game.i18n.format('PF2E.InitiativeWithSkill', { skillName });
        data.attributes.initiative.roll = (event) => {
            PF2Check.roll(new PF2CheckModifier(data.attributes.initiative.label, data.attributes.initiative), { type: 'initiative' }, event, (roll) => {
              this._applyInitiativeRollToCombatTracker(roll);
            });
        };
    }

    _applyInitiativeRollToCombatTracker(roll) {
      if (roll) {
        // check that there is a combat active in this scene
        if (!game.combat) {
          ui.notifications.error("No active encounters in the Combat Tracker.");
          return;
        }

        const combatant = game.combat.turns.find(c => c.actor.id === this._id)
        if(combatant == undefined) {
          ui.notifications.error(`No combatant found for ${this.name} in the Combat Tracker.`);
          return;
        }
        game.combat.setInitiative(combatant._id, roll.total);
      } else {
        console.log("PF2e System | _applyInitiativeRollToCombatTracker | invalid roll object or roll.value mising: ", roll);
      }
    }

    getFirstWornArmor() {
        return this.data.items.filter((item) => item.type === 'armor')
            .filter((armor) => armor.data.armorType.value !== 'shield')
            .find((armor) => armor.data.equipped.value);
    }

    static traits(source) {
      if (Array.isArray(source)) {
        return source;
      } else if (typeof source === 'string') {
        return source.split(',').map((trait) => trait.trim());
      } else {
        return [];
      }
    }

    /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  _prepareNPCData(data) {
    // As we only capture the NPCs Spell DC attribute, we need to calculate the Spell Attack Roll.
    // see sidebar on p298 of pf2e core rulebook.

    // data.attributes.spelldc.value = data.attributes.spelldc.dc - 10;
  }

  getStrikeDescription(item) {
    const flavor = {
      description: 'PF2E.Strike.Default.Description',
      criticalSuccess: 'PF2E.Strike.Default.CriticalSuccess',
      success: 'PF2E.Strike.Default.Success',
    };
    if (this.constructor.traits(item?.data?.traits?.value).includes('unarmed')) {
      flavor.description = 'PF2E.Strike.Unarmed.Description';
      flavor.success = 'PF2E.Strike.Unarmed.Success';
    } else if (this.constructor.traits(item?.data?.traits?.value).find((trait) => trait.startsWith('thrown'))) {
      flavor.description = 'PF2E.Strike.Combined.Description';
      flavor.success = 'PF2E.Strike.Combined.Success';
    } else if (item?.data?.range?.value === 'melee') {
      flavor.description = 'PF2E.Strike.Melee.Description';
      flavor.success = 'PF2E.Strike.Melee.Success';
    } else if ((item?.data?.range?.value ?? 0) > 0) {
      flavor.description = 'PF2E.Strike.Ranged.Description';
      flavor.success = 'PF2E.Strike.Ranged.Success';
    }
    return flavor;
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
      result = `${game.i18n.localize("PF2E.CritSuccess")  } ${  game.i18n.localize("PF2E.Recovery.critSuccess")}`;
    } else if (flatCheck.result == 1 || flatCheck.result <= (dc-10)) {
      result = `${game.i18n.localize("PF2E.CritFailure")  } ${  game.i18n.localize("PF2E.Recovery.critFailure")}`;
    } else if (flatCheck.result >= dc) {
      result = `${game.i18n.localize("PF2E.Success")  } ${  game.i18n.localize("PF2E.Recovery.success")}`;
    } else {
      result = `${game.i18n.localize("PF2E.Failure")  } ${  game.i18n.localize("PF2E.Recovery.failure")}`;
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
    const flavor = `${CONFIG.PF2E.attributes[attributeName]} Check`;
    // Call the roll helper utility
    DicePF2e.d20Roll({
      event,
      parts,
      data: {
        mod: skl.value - (skl.item??0),
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
        whisper: ChatMessage.getWhisperRecipients("GM"),
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
  async importItemFromCollection(collection, entryId, location) {
    // if location parameter missing, then use the super method
    if (location == null) {
      console.log(`PF2e System | importItemFromCollection | Location not defined for ${entryId} - using super imprt method instead`);
      super.importItemFromCollection(collection, entryId);
      return;
    }

    const pack = game.packs.find(p => p.collection === collection);
    if (pack.metadata.entity !== "Item") return;
    return await pack.getEntity(entryId).then(async ent => {
      console.log(`PF2e System | importItemFromCollection | Importing using createOwnedItem for ${ent.name} from ${collection}`);
      if (ent.type === 'spell') {

        // for prepared spellcasting entries, set showUnpreparedSpells to true to avoid the confusion of nothing appearing to happen.
        this._setShowUnpreparedSpells(location, ent?.data?.data?.level?.value);

        ent.data.data.location = {
          value: location,
        };
      }
      delete ent.data._id;
      return await this.createOwnedItem(ent.data);
    });

  }

  async _setShowUnpreparedSpells(entryId, spellLevel) {
    if (entryId && spellLevel) {
      let spellcastingEntry = this.getOwnedItem(entryId);

      if (spellcastingEntry?.data?.data?.prepared?.value === "prepared" && spellcastingEntry?.data?.data?.showUnpreparedSpells?.value === false) {
        if (CONFIG.debug.hooks === true) console.log(`PF2e DEBUG | Updating spellcasting entry ${entryId} set showUnpreparedSpells to true.`);
        const currentLvlToDisplay = {};
        currentLvlToDisplay[spellLevel] = true;
        await this.updateEmbeddedEntity('OwnedItem', {
          _id: entryId,
          'data.showUnpreparedSpells.value': true,
          'data.displayLevels': currentLvlToDisplay
        });
      }
    }
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
    const {hp} = this.data.data.attributes;
    const {sp} = this.data.data.attributes;

    if ( attribute === 'attributes.shield') {
      const {shield} = this.data.data.attributes;
      if (isDelta && value < 0) {
        value = Math.min( (shield.hardness + value) , 0); // value is now a negative modifier (or zero), taking into account hardness
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

  /**
   * Adds a custom modifier that will be included when determining the final value of a stat. The
   * name parameter must be unique for the custom modifiers for the specified stat, or it will be
   * ignored.
   *
   * @param {string} stat
   * @param {string} name
   * @param {number} value
   * @param {string} type
   */
  async addCustomModifier(stat, name, value, type) {
    const customModifiers = duplicate(this.data.data.customModifiers ?? {});
    if (!(customModifiers[stat] ?? []).find((m) => m.name === name)) {
      const modifier = new PF2Modifier(name, value, type);
      modifier.custom = true;
      customModifiers[stat] = (customModifiers[stat] ?? []).concat([modifier]);
      await this.update({'data.customModifiers': customModifiers});
    }
  }

  /**
   * Removes a custom modifier, either by index or by name.
   *
   * @param {string} stat
   * @param {string|number} modifier name or index of the modifier to remove
   */
  async removeCustomModifier(stat, modifier) {
    const customModifiers = duplicate(this.data.data.customModifiers ?? {});
    if (typeof modifier === 'number' && customModifiers[stat] && customModifiers[stat].length > modifier) {
      const statModifiers = customModifiers[stat];
      statModifiers.splice(modifier, 1);
      customModifiers[stat] = statModifiers;
      await this.update({'data.customModifiers': customModifiers});
    } else if (typeof modifier === 'string' && customModifiers[stat] && customModifiers[stat].length > 0) {
      customModifiers[stat] = customModifiers[stat].filter((m) => m.name !== modifier);
      await this.update({'data.customModifiers': customModifiers});
    }
  }
}

Handlebars.registerHelper('if_stamina', function(options) {
  if(game.settings.get('pf2e', 'staminaVariant') > 0) {
    return options.fn(this);
  }
    return ''

});

Handlebars.registerHelper('add', function(a, b) {
    return a + b;
});

Handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
});