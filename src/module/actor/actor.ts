/* global ChatMessage, Roll, getProperty, ui, CONST */
/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
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
import { PF2eConditionManager } from '../conditions';
import { PF2WeaponDamage } from '../system/damage/weapon';
import { PF2Check, PF2DamageRoll } from '../system/rolls';
import {isCycle} from "../item/container";
import { getArmorBonus, getAttackBonus, getResiliencyBonus } from '../item/runes';
import { TraitSelector5e } from '../system/trait-selector';
import { DicePF2e } from '../../scripts/dice'
import PF2EItem from '../item/item';
import { ConditionData, ArmorData, MartialData, WeaponData } from '../item/dataDefinitions';
import { CharacterData, NpcData, SaveData } from './actorDataDefinitions';

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

const SKILL_EXPANDED = Object.freeze({
  acrobatics: { ability: 'dex', shortform: 'acr' },
  arcana: { ability: 'int', shortform: 'arc' },
  athletics: { ability: 'str', shortform: 'ath' },
  crafting: { ability: 'int', shortform: 'cra' },
  deception: { ability: 'cha', shortform: 'dec' },
  diplomacy: { ability: 'cha', shortform: 'dip' },
  intimidation: { ability: 'cha', shortform: 'itm' },
  medicine: { ability: 'wis', shortform: 'med' },
  nature: { ability: 'wis', shortform: 'nat' },
  occultism: { ability: 'int', shortform: 'occ' },
  performance: { ability: 'cha', shortform: 'pfr' },
  religion: { ability: 'wis', shortform: 'rel' },
  society: { ability: 'int', shortform: 'soc' },
  stealth: { ability: 'dex', shortform: 'ste' },
  survival: { ability: 'wis', shortform: 'sur' },
  thievery: { ability: 'dex', shortform: 'thi' }
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
]);

export default class PF2EActor extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Synchronize the token image with the actor image, if the token does not currently have an image.
    this._prepareTokenImg();

    // Prepare character & npc data; primarily attribute and action calculation.
    const actorData = this.data;
    if (actorData.type === 'character') this._prepareCharacterData(actorData);
    else if (actorData.type === 'npc') this._prepareNPCData(actorData);

    if ('traits' in actorData.data) {
      // TODO: Migrate trait storage format
      const map = {
        dr: CONFIG.PF2E.damageTypes,
        di: CONFIG.PF2E.damageTypes,
        dv: CONFIG.PF2E.damageTypes,
        ci: CONFIG.PF2E.conditionTypes,
        languages: CONFIG.PF2E.languages,
      };
      for (const [t, choices] of Object.entries(map)) {
        const trait = actorData.data.traits[t];
        if (trait === undefined) continue;
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
      if (this.data.token.img === 'icons/svg/mystery-man.svg' && this.data.token.img !== this.img) {
        this.data.token.img = this.img;
      }
    }

  }

  /* -------------------------------------------- */

  /** Prepare Character type specific data. */
  private _prepareCharacterData(actorData: CharacterData) {
    const {data} = actorData;
    const { statisticsModifiers, damageDice } = this._prepareCustomModifiers(actorData);

    // Compute ability modifiers from raw ability scores.
    for (const abl of Object.values(actorData.data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
    }

    // Update experience percentage from raw experience amounts.
    data.details.xp.pct = Math.min(Math.round((data.details.xp.value * 100) / data.details.xp.max), 99.5);

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
      // Base modifiers from ability scores & level/proficiency rank.
      const modifiers = [
        AbilityModifier.fromAbilityScore(save.ability, data.abilities[save.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, save.rank),
      ];

      // Add resiliency bonuses for wearing armor with a resiliency rune.
      if (worn) {
        const resiliencyBonus = getResiliencyBonus(worn.data);
        if (resiliencyBonus > 0) {
          modifiers.push(new PF2Modifier(worn.name, resiliencyBonus, PF2ModifierType.ITEM));
        }
      }

      // Add explicit item bonuses which were set on this save; hopefully this will be superceded
      // by just using custom modifiers in the future.
      if (save.item) {
        modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', Number(save.item), PF2ModifierType.ITEM));
      }

      // Add custom modifiers relevant to this save.
      [saveName, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      // Create a new modifier from the modifiers, then merge in other fields from the old save data, and finally
      // overwrite potentially changed fields.
      const statisticMod = mergeObject<SaveData>(new PF2StatisticModifier(saveName, modifiers) as SaveData, data.saves[saveName], { overwrite: false });
      statisticMod.value = statisticMod.totalModifier;
      statisticMod.breakdown = statisticMod.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
          .join(', ');
      statisticMod.roll = (event, options = [], callback?) => {
          const label = game.i18n.format('PF2E.SavingThrowWithName', { saveName: game.i18n.localize(CONFIG.saves[saveName]) });
          PF2Check.roll(new PF2CheckModifier(label, statisticMod), { actor: this, type: 'saving-throw', options }, event, callback);
        };

      data.saves[saveName] = statisticMod;
    }

    // Martial
    for (const skl of Object.values(data.martial)) {
      const proficiency = ProficiencyModifier.fromLevelAndRank(data.details.level.value, skl.rank || 0);
      skl.value = proficiency.modifier;
      skl.breakdown = `${game.i18n.localize(proficiency.name)} ${proficiency.modifier < 0 ? '' : '+'}${proficiency.modifier}`;
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

      data.attributes.ac = new PF2StatisticModifier("ac", modifiers);
      // preserve backwards-compatibility
      data.attributes.ac.value = 10 + data.attributes.ac.totalModifier;
      data.attributes.ac.check = armorCheckPenalty;
      data.attributes.ac.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')].concat(
        data.attributes.ac.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');
    }

    // Shield
    const shield = this.getFirstEquippedShield();
    if (shield) {
        data.attributes.shield.value = shield.data.hp.value;
        data.attributes.shield.max = shield.data.maxHp.value;
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
      data.skills[skillName] = updated;
    }

    // Automatic Actions
    data.actions = [];

    // Strikes
    {
      // collect the weapon proficiencies
      const proficiencies = {
        simple: { name: 'Simple', rank: data?.martial?.simple?.rank ?? 0 },
        martial: { name: 'Martial', rank: data?.martial?.martial?.rank ?? 0 },
        advanced: { name: 'Advanced', rank: data?.martial?.advanced?.rank ?? 0 },
        unarmed: { name: 'Unarmed', rank: data?.martial?.unarmed?.rank ?? 0 },
      };
      (actorData.items ?? []).filter((item): item is MartialData => item.type === 'martial').forEach((item) => {
        proficiencies[item._id] = {
          name: item.name,
          rank: Number(item?.data?.proficient?.value ?? 0),
        };
      });

      // Always add a basic unarmed strike.
      const unarmed: any = {
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

      (actorData.items ?? []).filter((item): item is WeaponData => item.type === 'weapon').concat([unarmed]).forEach((item) => {
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
        const map = PF2EItem.calculateMap(item);
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
        if (combatant === undefined) {
          ui.notifications.error(`No combatant found for ${this.name} in the Combat Tracker.`);
          return;
        }
        game.combat.setInitiative(combatant._id, roll.total);
      } else {
        console.log("PF2e System | _applyInitiativeRollToCombatTracker | invalid roll object or roll.value mising: ", roll);
      }
    }

    getFirstWornArmor(): ArmorData {
        return this.data.items.filter((item): item is ArmorData => item.type === 'armor')
            .filter((armor) => armor.data.armorType.value !== 'shield')
            .find((armor) => armor.data.equipped.value);
    }

    getFirstEquippedShield(): ArmorData {
        return this.data.items.filter((item): item is ArmorData => item.type === 'armor')
            .filter(armor => armor.data.armorType.value === 'shield')
            .find(shield => shield.data.equipped.value);
    }

    static traits(source) {
      if (Array.isArray(source)) {
        return source;
      } else if (typeof source === 'string') {
        return source.split(',').map((trait) => trait.trim());
      }
      return [];
    }

    /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  private _prepareNPCData(actorData: NpcData) {
    const { data } = actorData;
    const { statisticsModifiers } = this._prepareCustomModifiers(actorData);

    // Compute 'fake' ability scores from ability modifiers (just incase the scores are required for something).
    for (const abl of Object.values(actorData.data.abilities)) {
      if (!abl.mod) abl.mod = 0;
      abl.value = abl.mod * 2 + 10;
    }

    // Armor Class
    {
      const base: number = data.attributes.ac.base ?? Number(data.attributes.ac.value);
      const modifiers = [
        new PF2Modifier('PF2E.BaseModifier', base - 10 - data.abilities.dex.mod, PF2ModifierType.UNTYPED),
        new PF2Modifier(CONFIG.abilities.dex, data.abilities.dex.mod, PF2ModifierType.ABILITY)
      ];
      ['ac', 'dex-based', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      const stat = new PF2StatisticModifier("ac", modifiers);
      // copy all fields from the original save object, exclude fields already defined on the stat
      Object.entries(data.attributes.ac as Record<string, any>).filter(([key, _]) => stat[key] === undefined).forEach(([key, value]) => { stat[key] = value });
      stat.base = base;
      stat.value = 10 + stat.totalModifier;
      stat.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')].concat(
        stat.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');
      data.attributes.ac = stat;
    }

    // Saving Throws
    for (const [saveName, save] of Object.entries(data.saves as Record<string, any>)) {
      const base: number = save.base ?? Number(save.value);
      const modifiers = [
        new PF2Modifier('PF2E.BaseModifier', base - data.abilities[save.ability].mod, PF2ModifierType.UNTYPED),
        new PF2Modifier(CONFIG.abilities[save.ability], data.abilities[save.ability].mod, PF2ModifierType.ABILITY)
      ];
      [saveName, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      const stat = new PF2StatisticModifier(saveName, modifiers);
      // copy all fields from the original save object, exclude fields already defined on the stat
      Object.entries(save as Record<string, any>).filter(([key, _]) => stat[key] === undefined).forEach(([key, value]) => { stat[key] = value });
      stat.base = base;
      stat.value = stat.totalModifier;
      stat.breakdown = stat.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      stat.roll = (event, options = [], callback?) => {
        const label = game.i18n.format('PF2E.SavingThrowWithName', { saveName: game.i18n.localize(CONFIG.saves[saveName]) });
        PF2Check.roll(new PF2CheckModifier(label, stat), { actor: this, type: 'saving-throw', options }, event, callback);
      };
      data.saves[saveName] = stat; 
    }

    // Perception
    {
      const base: number = data.attributes.perception.base ?? Number(data.attributes.perception.value);
      const modifiers = [
        new PF2Modifier('PF2E.BaseModifier', base - data.abilities.wis.mod, PF2ModifierType.UNTYPED),
        new PF2Modifier(CONFIG.abilities.wis, data.abilities.wis.mod, PF2ModifierType.ABILITY)
      ];
      ['perception', 'wis-based', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      const stat = new PF2StatisticModifier('perception', modifiers);
      // copy all fields from the original save object, exclude fields already defined on the stat
      Object.entries(data.attributes.perception as Record<string, any>).filter(([key, _]) => stat[key] === undefined).forEach(([key, value]) => { stat[key] = value });
      stat.base = base;
      stat.value = stat.totalModifier;
      stat.breakdown = stat.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      stat.roll = (event, options = [], callback?) => {
        const label = game.i18n.localize('PF2E.PerceptionCheck');
        PF2Check.roll(new PF2CheckModifier(label, stat), { actor: this, type: 'perception-check', options }, event, callback);
      };
      data.attributes.perception = stat;
    }

    // process OwnedItem instances, which for NPCs include skills, attacks, equipment, special abilities etc.
    for (const item of actorData.items) {
      if (item.type === 'lore') { // skill
        // normalize skill name to lower-case and dash-separated words
        const skill = item.name.toLowerCase().replace(/\s+/g, '-');
        // assume lore, if skill cannot be looked up
        const { ability, shortform } = SKILL_EXPANDED[skill] ?? { ability: 'int', shortform: skill };

        const base: number = (item.data.mod as any).base ?? Number(item.data.mod.value);
        const modifiers = [
          new PF2Modifier('PF2E.BaseModifier', base - data.abilities[ability].mod, PF2ModifierType.UNTYPED),
          new PF2Modifier(CONFIG.abilities[ability], data.abilities[ability].mod, PF2ModifierType.ABILITY)
        ];
        [skill, `${ability}-based`, 'skill-check', 'all'].forEach((key) => {
          (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
        });

        const stat = new PF2StatisticModifier(item.name, modifiers);
        // copy all fields from the original save object, exclude fields already defined on the stat
        Object.entries(data.skills[shortform] ?? {} as Record<string, any>).filter(([key, _]) => stat[key] === undefined).forEach(([key, value]) => { stat[key] = value });
        stat.base = base;
        stat.expanded = skill;
        stat.label = item.name;
        stat.value = stat.totalModifier;
        stat.visible = true;
        stat.breakdown = stat.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
          .join(', ');
        stat.roll = (event, options = [], callback?) => {
          const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: item.name });
          PF2Check.roll(new PF2CheckModifier(label, stat), { actor: this, type: 'skill-check', options }, event, callback);
        };
        data.skills[shortform] = stat;
      }
    }

  }

  /** Compute custom stat modifiers provided by users or given by conditions. */
  private _prepareCustomModifiers(actorData: CharacterData | NpcData): {
    statisticsModifiers: Record<string, any>,
    damageDice: Record<string, any>
  } {
    const {data} = actorData;

    // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
    // TODO: Improve the typing here once we have more types; should be PF2Modifiers & PF2DamageDice (when they are interfaces).
    const statisticsModifiers: Record<string, any> = {};
    const damageDice: Record<string, any> = {};

    // Custom Modifiers (which affect d20 rolls and damage).
    data.customModifiers = data.customModifiers ?? {};
    for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
      statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifiers);
    }

    // Damage Dice (which add dice to damage rolls).
    data.damageDice = data.damageDice ?? {};
    for (const [attack, dice] of Object.entries(data.damageDice)) {
      damageDice[attack] = (damageDice[attack] || []).concat(dice);
    }

    // Get all of the active conditions (from the item array), and add their modifiers.
    const conditions = PF2eConditionManager.getAppliedConditions(
      Array.from<ConditionData>(actorData.items.filter((i): i is ConditionData => i.type === 'condition')));
    for (const [key, value] of PF2eConditionManager.getModifiersFromConditions(conditions)) {
      statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
    }

    return {
      statisticsModifiers,
      damageDice
    };
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

    if (flatCheck.total === 20 || flatCheck.total >= (dc+10)) {
      result = `${game.i18n.localize("PF2E.CritSuccess")} ${game.i18n.localize("PF2E.Recovery.critSuccess")}`;
    } else if (flatCheck.total === 1 || flatCheck.total <= (dc-10)) {
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
        itemBonus
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
      const shieldFlavor = (attribute === 'attributes.shield') ? game.i18n.localize("PF2E.UI.applyDamage.shieldActive") : game.i18n.localize("PF2E.UI.applyDamage.shieldInActive");
      for (const t of canvas.tokens.controlled) {
        const appliedResult = (value>0) ? game.i18n.localize("PF2E.UI.applyDamage.damaged") + value : game.i18n.localize("PF2E.UI.applyDamage.healed") + value*-1;
        const modifiedByGM = modifier!==0 ? `Modified by GM: ${modifier<0 ? '-' : '+'}${modifier}` : '';
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

        t.actor.modifyTokenAttribute(attribute, value*-1, true, true).then(() => {
          ChatMessage.create({
            user: game.user._id,
            speaker: { alias: t.name },
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
          });
        });
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
      if(combatant === undefined) {
        ui.notifications.error("You haven't added this token to the Combat Tracker.");
        return;
      }
      let value = valueRolled;
      let initBonus = 0;
      // Other actor types track iniative differently, which will give us NaN errors
      if(combatant.actor.data.type === "npc") {
        initBonus += combatant.actor.data.data.attributes.initiative.circumstance + combatant.actor.data.data.attributes.initiative.status;
      }
      // Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
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
    await Promise.all(promises);
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
    await pack.getEntity(entryId).then(async ent => {
      console.log(`PF2e System | importItemFromCollectionWithLocation | Importing using createOwnedItem for ${ent.name} from ${collection}`);
      if (ent.type === 'spell') {

        // for prepared spellcasting entries, set showUnpreparedSpells to true to avoid the confusion of nothing appearing to happen.
        this._setShowUnpreparedSpells(location, ent?.data?.data?.level?.value);

        ent.data.data.location = {
          value: location,
        };
      }
      delete ent.data._id;
      return this.createOwnedItem(ent.data);
    });
  }

  async _setShowUnpreparedSpells(entryId, spellLevel) {
    if (entryId && spellLevel) {
      const spellcastingEntry = this.getOwnedItem(entryId);
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
    if (Number.isNaN(value)) {
      return Promise.reject();
    }

    if (['attributes.shield', 'attributes.hp'].includes(attribute)) {
      const updateActorData = {};
      let updateShieldData;
      if (attribute === 'attributes.shield') {
        const shield = this.getFirstEquippedShield();
        if (shield) {
          let shieldHitPoints = shield.data.hp.value;
          if (isDelta && value < 0) {
            // shield block
            value = Math.min(shield.data.hardness.value + value, 0); // value is now a negative modifier (or zero), taking into account hardness
            if (value < 0) {
              attribute = 'attributes.hp'; // update the actor's hit points after updating the shield
              shieldHitPoints = Math.clamped(shield.data.hp.value + value, 0, shield.data.maxHp.value);
            }
          } else {
            shieldHitPoints = Math.clamped(value, 0, shield.data.maxHp.value)
          }
          shield.data.hp.value = shieldHitPoints; // ensure the shield item has the correct state in prepareData() on the first pass after Actor#update
          updateActorData['data.attributes.shield.value'] = shieldHitPoints;
          // actor update is necessary to properly refresh the token HUD resource bar
          updateShieldData = {
            '_id': shield._id,
            data: { hp: { value: shieldHitPoints } } // unfolding is required when update is forced regardless of diff
          };
        } else if (isDelta) {
          attribute = 'attributes.hp'; // actor has no shield, apply the specified delta value to actor instead
        }
      }

      if (attribute === 'attributes.hp') {
        const {hp, sp} = this.data.data.attributes;
        if (isDelta) {
          if (value < 0) {
            const { update, delta } = this._calculateHealthDelta({hp, sp, delta: value});
            value = delta;
            for (const [k, v] of Object.entries(update)) {
              updateActorData[k] = v;
            }
          }
          value = Math.clamped(Number(hp.value) + value, 0, hp.max);
        }
        value = Math.clamped(value, 0, hp.max);
        updateActorData['data.attributes.hp.value'] = value;
      }

      return this.update(updateActorData).then(() => {
        if (updateShieldData) {
          // this will trigger a second prepareData() call, but is necessary for persisting the shield state
          this.updateOwnedItem(updateShieldData, { diff: false });
        }
        return this;
      }) as Promise<PF2EActor>;
    }
    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  /**
   * Moves an item to another actor's inventory
   * @param {sourceActor} Instance of actor sending the item.
   * @param {targetActor} Instance of actor to receiving the item.
   * @param {item}        Instance of the item being transferred.
   * @param {quantity}    Number of items to move.
   * @param {containerId} Id of the container that will contain the item.
   */
  static async transferItemToActor(sourceActor, targetActor, item, quantity, containerId) {
      const sourceItemQuantity = Number(item.data.data.quantity.value);

      if (quantity > sourceItemQuantity) {
        quantity = sourceItemQuantity;
      }

      const newItemQuantity = sourceItemQuantity - quantity;
      const hasToRemoveFromSource = newItemQuantity < 1;

      if (hasToRemoveFromSource) {
        await sourceActor.deleteEmbeddedEntity('OwnedItem', item._id);
      } else {
        const update = { '_id': item._id, 'data.quantity.value': newItemQuantity };
        await sourceActor.updateEmbeddedEntity('OwnedItem', update);
      }

      let itemInTargetActor = targetActor.items.find(i => i.name === item.name);

      if (itemInTargetActor !== null)
      {
        // Increase amount of item in target actor if there is already an item with the same name
        const targetItemNewQuantity = Number(itemInTargetActor.data.data.quantity.value) + quantity;
        const update = { '_id': itemInTargetActor._id, 'data.quantity.value': targetItemNewQuantity};
        await targetActor.updateEmbeddedEntity('OwnedItem', update);
      }
      else
      {
        // If no item with the same name in the target actor, create new item in the target actor
        const newItemData = duplicate(item);
        newItemData.data.quantity.value = quantity;

        const result = await targetActor.createOwnedItem(newItemData);

        itemInTargetActor = targetActor.items.get(result._id);
      }

      return PF2EActor.stashOrUnstash(targetActor, () => { return itemInTargetActor; }, containerId);
  }

  /**
   * Moves an item into the inventory into or out of a container.
   * @param {actor}       Actor whose inventory should be edited.
   * @param {getItem}     Lambda returning the item.
   * @param {containerId} Id of the container that will contain the item.
   */
  static async stashOrUnstash(actor, getItem, containerId) {
      const item = await getItem();
      if (containerId) {
          if (item.type !== 'spell' && !isCycle(item._id, containerId, actor.data.items)) {
              return item.update({
                  'data.containerId.value': containerId,
                  'data.equipped.value': false,
              });
          }
          return item;
      }
      const result = await item.update({'data.containerId.value': ''});
      return result;
  }

  /**
   * Handle how changes to a Token attribute bar are applied to the Actor.
   * This allows for game systems to override this behavior and deploy special logic.
   * @param {object} args   Contains references to the hp, and sp objects.
   */
  _calculateHealthDelta(args) {
    const update = {};
    const {hp, sp} = args;
    let {delta} = args;
    if ((hp.temp + delta) >= 0) {
      update['data.attributes.hp.temp'] = hp.temp + delta;
      delta = 0;
    } else {
      update['data.attributes.hp.temp'] = 0;
      delta = hp.temp + delta;
    }
    if (game.settings.get('pf2e', 'staminaVariant') > 0 && delta < 0) {
      if ((sp.value + delta) >= 0) {
        update['data.attributes.sp.value'] = sp.value + delta;
        delta = 0;
      } else {
        update['data.attributes.sp.value'] = 0;
        delta = sp.value + delta;
      }
    }
    return {
      update,
      delta
    };
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
    if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
      throw new Error(`${rollName} is not a supported roll`);
    }
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.setFlag(game.system.id, flag, !this.getFlag(game.system.id, flag));
  }

  async setRollOption(rollName, optionName, enabled) {
    if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
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
