/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
import CharacterData from './character';
import {
    AbilityModifier,
    DEXTERITY,
    PF2CheckModifier,
    PF2DamageDice,
    PF2Modifier,
    PF2ModifierType,
    PF2ModifierPredicate,
    PF2StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from '../modifiers';
import { ConditionModifiers } from '../condition-modifiers';
import { PF2eConditionManager } from '../conditions';
import { PF2WeaponDamage } from '../system/damage/weapon';
import { PF2Check, PF2DamageRoll } from '../system/rolls';
import { getArmorBonus, getAttackBonus, getResiliencyBonus } from '../item/runes';
import { TraitSelector5e } from '../system/trait-selector';
import { DicePF2e } from '../../scripts/dice'
import PF2EItem from '../item/item';
import { ConditionData } from '../item/dataDefinitions';

export const SKILL_DICTIONARY = Object.freeze({
  acr: 'acrobatics',
  arc: 'arcana',
  ath: 'athletics',
  cra: 'crafting',
  dec: 'deception',
  dip: 'diplomacy',
  itm: 'intimidation',
  med: 'medicine',
  nat: 'nature',
  occ: 'occultism',
  prf: 'performance',
  rel: 'religion',
  soc: 'society',
  ste: 'stealth',
  sur: 'survival',
  thi: 'thievery'
});

const SUPPORTED_ROLL_OPTIONS = Object.freeze([
  'all',
  'attack-roll',
  'damage-roll',
  'saving-throw',
  'fortitude',
  'reflex',
  'will',
  'perception',
  'initiative',
  'skill-check',
].concat(
  Object.values(SKILL_DICTIONARY)
));

export default class PF2EActor extends Actor {

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
      for (const abl of Object.values(data.abilities as Record<any, any>)) {
        if (!abl.mod) abl.mod = 0;
        abl.value = abl.mod * 2 + 10;
      }
    } else if (actorData.type == 'character') {
      for (const abl of Object.values(data.abilities as Record<any, any>)) {
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
    const damageDice = {};

    // custom modifiers
    data.customModifiers = data.customModifiers ?? {}; // eslint-disable-line no-param-reassign
    for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
      statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifiers); // eslint-disable-line no-param-reassign
    }

    // damage dice
    data.damageDice = data.damageDice ?? {}; // eslint-disable-line no-param-reassign
    for (const [attack, dice] of Object.entries(data.damageDice)) {
      damageDice[attack] = (damageDice[attack] || []).concat(dice); // eslint-disable-line no-param-reassign
    }

    // Conditions
    const conditions = PF2eConditionManager.getAppliedConditions(
      Array.from<ConditionData>(actorData.items.filter((i:PF2EItem) => i.type === 'condition'))
    );

    PF2eConditionManager.getModifiersFromConditions(conditions).forEach(
      (value: Array<PF2Modifier>, key: string) => {
        statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value); // eslint-disable-line no-param-reassign      
      });

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
    for (const [saveName, save] of Object.entries(data.saves as Record<any, any>)) {
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
      [saveName, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) => {
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
      updated.roll = (event, options = [], callback?) => {
        const label = game.i18n.format('PF2E.SavingThrowWithName', { saveName: game.i18n.localize(CONFIG.saves[saveName]) });
        PF2Check.roll(new PF2CheckModifier(label, updated), { actor: this, type: 'saving-throw', options }, event, callback);
      };
      data.saves[saveName] = updated; // eslint-disable-line no-param-reassign
    }

    // Martial
    for (const skl of Object.values(data.martial as Record<any, any>)) {
      const proficiency = ProficiencyModifier.fromLevelAndRank(data.details.level.value, skl.rank || 0).modifier;
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
      ['perception', 'wis-based', 'all'].forEach((key) => {
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
      data.attributes.perception.roll = (event, options = [], callback?) => {
        const label = game.i18n.localize('PF2E.PerceptionCheck');
        PF2Check.roll(new PF2CheckModifier(label, data.attributes.perception), { actor: this, type: 'perception-check', options }, event, callback);
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

    for (const [skillName, skill] of Object.entries(data.skills as Record<any, any>)) {
      const modifiers = [
        AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
      ];
      if(skill.rank === 0 && hasUntrainedImprovisation) {
        let bonus = 0;
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        if (rule === 'ProficiencyWithLevel') {
          bonus = data.details.level.value < 7 ? Math.floor(data.details.level.value / 2) : data.details.level.value;
        }
        else if (rule === 'ProficiencyWithoutLevel') {
          // No description in Gamemastery Guide on how to handle untrained improvisation.
        }
        modifiers.push(new PF2Modifier('PF2E.ProficiencyLevelUntrainedImprovisation', bonus, PF2ModifierType.PROFICIENCY));
      }
      if (skill.item) {
        modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', skill.item, PF2ModifierType.ITEM));
      }
      if (skill.armor && data.attributes.ac.check && data.attributes.ac.check < 0) {
        modifiers.push(new PF2Modifier('PF2E.ArmorCheckPenalty', data.attributes.ac.check, PF2ModifierType.UNTYPED));
      }

      // workaround for the shortform skill names
      const expandedName = SKILL_DICTIONARY[skillName];

      [expandedName, `${skill.ability}-based`, 'skill-check', 'all'].forEach((key) => {
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
      updated.roll = (event, options = [], callback?) => {
        const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: game.i18n.localize(CONFIG.skills[skillName]) });
        PF2Check.roll(new PF2CheckModifier(label, updated), { actor: this, type: 'skill-check', options }, event, callback);
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
        _id: 'fist',
        name: game.i18n.localize('PF2E.Strike.Fist.Label'),
        type: 'weapon',
        img: 'systems/pf2e/icons/features/classes/powerful-fist.jpg',
        data: {
          ability: { value: 'str' },
          weaponType: { value: 'unarmed' },
          bonus: { value: 0 },
          damage: { dice: 1, die: 'd4', damageType: 'bludgeoning' },
          range: { value: 'melee' },
          traits: { value: ['agile', 'finesse', 'nonlethal', 'unarmed'] },
        }
      };

      // powerful fist
      if ((actorData.items ?? []).some(i => i.type === 'feat' && i.name === 'Powerful Fist')) {
        unarmed.name = 'Powerful Fist';
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
        // conditions and custom modifiers to attack rolls
        {
          const stats = [];
          if (item.data?.group?.value) {
            stats.push(`${item.data.group.value.toLowerCase()}-weapon-group-attack`);
          }
          stats.push(`${item.name.replace(/\s+/g, '-').toLowerCase()}-attack`); // convert white spaces to dash and lower-case all letters
          stats.concat(['attack', `${item.data.ability.value}-attack`, `${item.data.ability.value}-based`, `${item._id}-attack`, 'attack-roll', 'all']).forEach((key) => {
            (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
          });
        }
        const action : any = new PF2StatisticModifier(item.name, modifiers);
        action.imageUrl = item.img;
        action.glyph = 'A';
        action.type = 'strike';
        const flavor = this.getStrikeDescription(item);
        action.description = flavor.description;
        action.criticalSuccess = flavor.criticalSuccess;
        action.success = flavor.success;
        action.traits = [{ name: 'attack', label: game.i18n.localize('PF2E.TraitAttack') }].concat(
          PF2EActor.traits(item?.data?.traits?.value).map((trait) => {
            const key = CONFIG.weaponTraits[trait] ?? trait;
            const option: {name: string, label: string, toggle: boolean, rollName?: string, rollOption?: string, cssClass?: string} = {
                name: trait,
                label: game.i18n.localize(key),
                toggle: false
            };

            // look for toggleable traits
            if (trait.startsWith('two-hand-')) {
                option.rollName = 'damage-roll';
                option.rollOption = 'two-handed';
            } else if (trait.startsWith('versatile-')) {
                option.rollName = 'damage-roll';
                option.rollOption = trait;
            }

            // trait can be toggled on/off
            if (option.rollName && option.rollOption) {
                option.toggle = true;
                option.cssClass = this.getRollOptions([option.rollName]).includes(option.rollOption) ? 'toggled-on' : 'toggled-off';
            }
            return option;
          })
        );
        action.breakdown = action.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
          .join(', ');
        // amend strike with a roll property
        action.attack = (event, options = []) => {
          PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action), { actor: this, type: 'attack-roll', options }, event);
        };
        action.roll = action.attack;
        let map = PF2EItem.calculateMap(item);
        action.variants = [
          {
            label: `Strike ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
            roll: (event, options = []) => PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action), { actor: this, type: 'attack-roll', options }, event)
          },
          {
            label: `MAP ${map.map2}`,
            roll: (event, options = []) => PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action, [new PF2Modifier('Multiple Attack Penalty', map.map2, PF2ModifierType.UNTYPED)]), { actor: this, type: 'attack-roll', options }, event)
          },
          {
            label: `MAP ${map.map3}`,
            roll: (event, options = []) => PF2Check.roll(new PF2CheckModifier(`Strike: ${action.name}`, action, [new PF2Modifier('Multiple Attack Penalty', map.map3, PF2ModifierType.UNTYPED)]), { actor: this, type: 'attack-roll', options }, event)
          },
        ];
        action.damage = (event, options = []) => {
          const damage = PF2WeaponDamage.calculate(item, actorData, action.traits, statisticsModifiers, damageDice, proficiencies[item.data.weaponType.value]?.rank ?? 0, options);
          PF2DamageRoll.roll(damage, { type: 'damage-roll', outcome: 'success', options }, event);
        };
        action.critical = (event, options = []) => {
          const damage = PF2WeaponDamage.calculate(item, actorData, action.traits, statisticsModifiers, damageDice, proficiencies[item.data.weaponType.value]?.rank ?? 0, options);
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
        data.attributes.initiative.roll = (event, options = []) => {
            PF2Check.roll(new PF2CheckModifier(data.attributes.initiative.label, data.attributes.initiative), { actor: this, type: 'initiative', options }, event, (roll) => {
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
    if (PF2EActor.traits(item?.data?.traits?.value).includes('unarmed')) {
      flavor.description = 'PF2E.Strike.Unarmed.Description';
      flavor.success = 'PF2E.Strike.Unarmed.Success';
    } else if (PF2EActor.traits(item?.data?.traits?.value).find((trait) => trait.startsWith('thrown'))) {
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

    if (flatCheck.total == 20 || flatCheck.total >= (dc+10)) {
      result = `${game.i18n.localize("PF2E.CritSuccess")} ${game.i18n.localize("PF2E.Recovery.critSuccess")}`;
    } else if (flatCheck.total == 1 || flatCheck.total <= (dc-10)) {
      result = `${game.i18n.localize("PF2E.CritFailure")} ${game.i18n.localize("PF2E.Recovery.critFailure")}`;
    } else if (flatCheck.result >= dc) {
      result = `${game.i18n.localize("PF2E.Success")} ${game.i18n.localize("PF2E.Recovery.success")}`;
    } else {
      result = `${game.i18n.localize("PF2E.Failure")} ${game.i18n.localize("PF2E.Recovery.failure")}`;
    }
    const rollingDescription = game.i18n.format("PF2E.Recovery.rollingDescription", { dc, dying });

    const message = `
      ${rollingDescription}.
      <div class="dice-roll">
        <div class="dice-formula" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-weight: 400;">
            ${result}
          </span>
        </div>
      </div>
      `;

      flatCheck.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: message
      }, {
        rollMode: game.settings.get('core', 'rollMode'),
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

    const rank = (i.data.proficient?.value || 0);
    const proficiency = ProficiencyModifier.fromLevelAndRank(this.data.data.details.level.value, rank).modifier;
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
      let value = valueRolled;
      let initBonus = 0;
      //Other actor types track iniative differently, which will give us NaN errors
      if(combatant.actor.data.type === "npc") {
        initBonus += combatant.actor.data.data.attributes.initiative.circumstance + combatant.actor.data.data.attributes.initiative.status;
      }
      //Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
      if (!combatant.actor.isPC) {
        initBonus += .5;
      }
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
  async importItemFromCollectionWithLocation(collection, entryId, location?) {
    // if location parameter missing, then use the super method
    if (location == null) {
      console.log(`PF2e System | importItemFromCollectionWithLocation | Location not defined for ${entryId} - using super imprt method instead`);
      super.importItemFromCollection(collection, entryId);
      return;
    }

    const pack = game.packs.find(p => p.collection === collection);
    if (pack.metadata.entity !== "Item") return;
    return await pack.getEntity(entryId).then(async ent => {
      console.log(`PF2e System | importItemFromCollectionWithLocation | Importing using createOwnedItem for ${ent.name} from ${collection}`);
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
      if (spellcastingEntry === null || spellcastingEntry.data.type !== 'spellcastingEntry')
        return;

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
   * @param {PF2ModifierPredicate} predicate
   * @param {string} damageType
   */
  async addCustomModifier(stat, name, value, type, predicate?, damageType?) {
    const customModifiers = duplicate(this.data.data.customModifiers ?? {});
    if (!(customModifiers[stat] ?? []).find((m) => m.name === name)) {
      const modifier = new PF2Modifier(name, value, type);
      if (damageType) {
        modifier.damageType = damageType;
      }
      modifier.custom = true;

      // modifier predicate
      modifier.predicate = predicate ?? {};
      if (!(modifier.predicate instanceof PF2ModifierPredicate)) {
        modifier.predicate =  new PF2ModifierPredicate(modifier.predicate);
      }
      modifier.ignored = !modifier.predicate.test([]);

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

  async addDamageDice(param) {
    if (!param.name) {
      throw new Error('name for damage dice is mandatory');
    }
    param.selector = param?.selector ?? 'damage';
    const damageDice = duplicate(this.data.data.damageDice ?? {});
    if (!(damageDice[param.selector] ?? []).find((d) => d.name === param.name)) {
      const dice = new PF2DamageDice(param);
      dice.custom = true;
      damageDice[param.selector] = (damageDice[param.selector] ?? []).concat([dice]);
      await this.update({'data.damageDice': damageDice});
    }
  }

  /**
   * Removes damage dice, either by index or by name.
   *
   * @param {string} selector
   * @param {string|number} dice name or index of the damage dice to remove
   */
  async removeDamageDice(selector, dice) {
    const damageDice = duplicate(this.data.data.damageDice ?? {});
    if (typeof dice === 'number' && damageDice[selector] && damageDice[selector].length > dice) {
      const diceModifiers = damageDice[dice];
      diceModifiers.splice(dice, 1);
      damageDice[dice] = diceModifiers;
      await this.update({'data.damageDice': damageDice});
    } else if (typeof dice === 'string' && damageDice[selector] && damageDice[selector].length > 0) {
      damageDice[selector] = damageDice[selector].filter((m) => m.name !== dice);
      await this.update({'data.damageDice': damageDice});
    }
  }

  async toggleRollOption(rollName, optionName) {
    if (!SUPPORTED_ROLL_OPTIONS.includes(rollName)) {
      throw new Error(`${rollName} is not a supported roll`);
    }
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.setFlag(game.system.id, flag, !this.getFlag(game.system.id, flag));
  }

  async setRollOption(rollName, optionName, enabled) {
    if (!SUPPORTED_ROLL_OPTIONS.includes(rollName)) {
      throw new Error(`${rollName} is not a supported roll`);
    }
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.setFlag(game.system.id, flag, !!enabled);
  }

  async unsetRollOption(rollName, optionName) {
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.unsetFlag(game.system.id, flag);
  }

  async enableRollOption(rollName, optionName) {
    this.setRollOption(rollName, optionName, true);
  }

  async disableRollOption(rollName, optionName) {
    this.setRollOption(rollName, optionName, false);
  }

  /**
   * @param {string[]} rollNames
   * @return {string[]}
   */
  getRollOptions(rollNames) {
    const flag = this.getFlag(game.system.id, 'rollOptions') ?? {};
    return rollNames.flatMap(rollName =>
      // convert flag object to array containing the names of all fields with a truthy value
      Object.entries(flag[rollName] ?? {}).reduce((opts, [key, value]) => opts.concat(value ? key : []), [])
    ).reduce((unique, option) => {
      // ensure option entries are unique
      return unique.includes(option) ? unique : unique.concat(option);
    }, []);
  }

}
