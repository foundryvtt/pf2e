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
import { ConditionData, ArmorData, MartialData, WeaponData, isPhysicalItem } from '../item/dataDefinitions';
import {
    CharacterData,
    NpcData,
    SaveData,
    SkillData,
    ClassDCData,
    ArmorClassData,
    PerceptionData,
    InitiativeData,
    CharacterStrikeTrait,
    CharacterStrike,
    DexterityModifierCapData,
    NPCArmorClassData,
    NPCSaveData,
    NPCPerceptionData,
    NPCSkillData,
    HitPointsData,
    FamiliarData
} from './actorDataDefinitions';
import {PF2RuleElement, PF2RuleElements} from "../rules/rules";

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

export const SKILL_EXPANDED = Object.freeze({
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
    const rules = actorData.items.reduce((accumulated, current) => accumulated.concat(PF2RuleElements.fromOwnedItem(current)), []);
    if (actorData.type === 'character') this._prepareCharacterData(actorData, rules);
    else if (actorData.type === 'npc') this._prepareNPCData(actorData, rules);
    else if (actorData.type === 'familiar') this._prepareFamiliarData(actorData, rules);

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
  private _prepareCharacterData(actorData: CharacterData, rules: PF2RuleElement[]) {
    const {data} = actorData;
    // Compute ability modifiers from raw ability scores.
    for (const abl of Object.values(actorData.data.abilities)) {
      abl.mod = Math.floor((abl.value - 10) / 2);
    }

    // Toggles
    (data as any).toggles = {
      actions: [
        { label: 'PF2E.TargetFlatFootedLabel', inputName: `flags.${game.system.id}.rollOptions.all.target:flatFooted`, checked: this.getFlag(game.system.id, 'rollOptions.all.target:flatFooted') }
      ]
    };

    const { statisticsModifiers, damageDice } = this._prepareCustomModifiers(actorData, rules);

    // Update experience percentage from raw experience amounts.
    data.details.xp.pct = Math.min(Math.round((data.details.xp.value * 100) / data.details.xp.max), 99.5);

    // PFS Level Bump - check and DC modifiers
    if (data.pfs?.levelBump) {
      statisticsModifiers.all = (statisticsModifiers.all || []).concat(
        new PF2Modifier('PF2E.PFS.LevelBump', 1, PF2ModifierType.UNTYPED)
      );
    }

    // Calculate HP and SP
    {
      const modifiers = [
        new PF2Modifier('PF2E.AncestryHP', data.attributes.ancestryhp, PF2ModifierType.UNTYPED)
      ];
  
      if (game.settings.get('pf2e', 'staminaVariant')) {
        const bonusSpPerLevel = data.attributes.levelbonussp * data.details.level.value;
        const halfClassHp = Math.floor(data.attributes.classhp / 2);
  
        data.attributes.sp.max = (halfClassHp + data.abilities.con.mod) * data.details.level.value
          + bonusSpPerLevel
          + data.attributes.flatbonussp;

        modifiers.push(new PF2Modifier('PF2E.ClassHP', (halfClassHp * data.details.level.value), PF2ModifierType.UNTYPED));
      } else {
        modifiers.push(new PF2Modifier('PF2E.ClassHP', data.attributes.classhp * data.details.level.value, PF2ModifierType.UNTYPED));
        modifiers.push(new PF2Modifier('PF2E.AbilityCon', data.abilities.con.mod * data.details.level.value, PF2ModifierType.UNTYPED));
      }

      if (data.attributes.flatbonushp) {
        modifiers.push(new PF2Modifier('PF2E.FlatBonusHP', data.attributes.flatbonushp, PF2ModifierType.UNTYPED));
      }
      if (data.attributes.levelbonushp) {
        modifiers.push(new PF2Modifier('PF2E.BonusHPperLevel', data.attributes.levelbonushp * data.details.level.value, PF2ModifierType.UNTYPED));
      }
  
      (statisticsModifiers.hp || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      (statisticsModifiers['hp-per-level'] || []).map((m) => duplicate(m)).forEach((m) => {
        m.modifier *= data.details.level.value;
        modifiers.push(m)
      });

      const stat = mergeObject<HitPointsData>(new PF2StatisticModifier("hp", modifiers) as HitPointsData, data.attributes.hp, { overwrite: false });

      // PFS Level Bump - hit points
      if (data.pfs?.levelBump) {
        const hitPointsBump = Math.max(10, stat.totalModifier * 0.1);
        stat.push(new PF2Modifier('PF2E.PFS.LevelBump', hitPointsBump, PF2ModifierType.UNTYPED))
      }

      stat.max = stat.totalModifier;
      stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
      stat.breakdown = stat.modifiers.filter((m) => m.enabled)
      .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      .join(', ');    
      
      data.attributes.hp = stat;
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
      const stat = mergeObject<SaveData>(new PF2StatisticModifier(saveName, modifiers) as SaveData, data.saves[saveName], { overwrite: false });
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

      const stat = mergeObject<PerceptionData>(new PF2StatisticModifier('perception', modifiers) as PerceptionData, data.attributes.perception, { overwrite: false });
      stat.breakdown = stat.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      stat.value = stat.totalModifier;
      stat.roll = (event, options = [], callback?) => {
        const label = game.i18n.localize('PF2E.PerceptionCheck');
        PF2Check.roll(new PF2CheckModifier(label, stat), { actor: this, type: 'perception-check', options }, event, callback);
      };

      data.attributes.perception = stat;
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

      const stat = mergeObject<ClassDCData>(new PF2StatisticModifier('PF2E.ClassDCLabel', modifiers) as ClassDCData, data.attributes.classDC, { overwrite: false });
      stat.value = 10 + stat.totalModifier;
      stat.ability = data.details.keyability.value;
      stat.breakdown = [game.i18n.localize('PF2E.ClassDCBase')].concat(
        stat.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');

      data.attributes.classDC = stat;
    }

    // Armor Class
    {
      const modifiers = [];
      const dexCap = duplicate(data.attributes.dexCap ?? []);
      let armorCheckPenalty = 0;
      let proficiency = 'unarmored';

      if (worn) {
        dexCap.push({ value: Number(worn.data.dex.value ?? 0), source: worn.name });
        proficiency = worn.data.armorType?.value;
        // armor check penalty
        if (data.abilities.str.value < Number(worn.data.strength.value ?? 0)) {
          armorCheckPenalty = Number(worn.data.check.value ?? 0);
        }
        modifiers.push(new PF2Modifier(worn.name, getArmorBonus(worn.data), PF2ModifierType.ITEM));
      }

      // proficiency
      modifiers.unshift(ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.martial[proficiency]?.rank ?? 0));

      // Dex modifier limited by the lowest dex cap, for example from armor
      const dexterity = DEXTERITY.withScore(data.abilities.dex.value);
      dexterity.modifier = Math.min(dexterity.modifier, ...dexCap.map(cap => cap.value));
      modifiers.unshift(dexterity);

      // condition and custom modifiers
      ['ac', 'dex-based', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      const stat = mergeObject<ArmorClassData>(new PF2StatisticModifier("ac", modifiers) as ArmorClassData, data.attributes.ac, { overwrite: false });
      stat.value = 10 + stat.totalModifier;
      stat.check = armorCheckPenalty;
      stat.dexCap = dexCap.reduce((result, current) => {
        if (result) {
          return result.value > current.value ? current : result;
        }
        return current;
      }, null);
      stat.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')].concat(
        stat.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');

      data.attributes.ac = stat;
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

    const skills = {}; // rebuild the skills object to clear out any deleted or renamed skills from previous iterations

    for (const [skillName, skill] of Object.entries(data.skills).filter(([shortform, _]) => Object.keys(SKILL_DICTIONARY).includes(shortform))) {
      const modifiers = [
        AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability].value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
      ];
      if(skill.rank === 0 && hasUntrainedImprovisation) {
        let bonus = 0;
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        if (rule === 'ProficiencyWithLevel') {
          bonus = data.details.level.value < 7 ? Math.floor(data.details.level.value / 2) : data.details.level.value;
        } else if (rule === 'ProficiencyWithoutLevel') {
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
      const stat = mergeObject<SkillData>(new PF2StatisticModifier(expandedName, modifiers) as SkillData, skill, { overwrite: false });
      stat.breakdown = stat.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      stat.value = stat.totalModifier;
      stat.roll = (event, options = [], callback?) => {
        const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: game.i18n.localize(CONFIG.skills[skillName]) });
        PF2Check.roll(new PF2CheckModifier(label, stat), { actor: this, type: 'skill-check', options }, event, callback);
      };

      skills[skillName] = stat;
    }

    // Lore skills
    actorData.items.filter(i => i.type === 'lore').forEach(skill => {
      // normalize skill name to lower-case and dash-separated words
      const shortform = skill.name.toLowerCase().replace(/\s+/g, '-');
      const rank = (skill.data as any).proficient.value;

      const modifiers = [
        AbilityModifier.fromAbilityScore('int', data.abilities.int.value),
        ProficiencyModifier.fromLevelAndRank(data.details.level.value, rank)
      ];
      if(rank === 0 && hasUntrainedImprovisation) {
        let bonus = 0;
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        if (rule === 'ProficiencyWithLevel') {
          bonus = data.details.level.value < 7 ? Math.floor(data.details.level.value / 2) : data.details.level.value;
        } else if (rule === 'ProficiencyWithoutLevel') {
          // No description in Gamemastery Guide on how to handle untrained improvisation.
        }
        modifiers.push(new PF2Modifier('PF2E.ProficiencyLevelUntrainedImprovisation', bonus, PF2ModifierType.PROFICIENCY));
      }
      [shortform, `int-based`, 'skill-check', 'all'].forEach((key) => {
        (statisticsModifiers[(key as any)] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      const stat = mergeObject(new PF2StatisticModifier(skill.name, modifiers) as NPCSkillData, data.skills[shortform], { overwrite: false });
      stat.itemID = skill._id;
      stat.rank = rank ?? 0;
      stat.shortform = shortform;
      stat.expanded = skill;
      stat.value = stat.totalModifier;
      stat.lore = true;
      stat.breakdown = stat.modifiers.filter((m) => m.enabled)
        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        .join(', ');
      stat.roll = (event, options = [], callback?) => {
        const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: skill.name });
        PF2Check.roll(new PF2CheckModifier(label, stat), { actor: this, type: 'skill-check', options }, event, callback);
      };

      skills[shortform] = stat;
    });

    (data as any).skills = skills;

    // Speeds
    {
      const label = game.i18n.localize('PF2E.SpeedTypesLand');
      const base = Number(data.attributes.speed.value ?? 0);
      const modifiers = [];
      ['land-speed', 'speed'].forEach((key) => {
        (statisticsModifiers[(key as any)] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });
      const stat = mergeObject(new PF2StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: label }), modifiers) as any, data.attributes.speed, { overwrite: false });
      stat.total = base + stat.totalModifier;
      stat.type = 'land';
      stat.breakdown = [`${game.i18n.format('PF2E.SpeedBaseLabel', { type: label })} ${base}`].concat(
        stat.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');
      data.attributes.speed = stat;
    }
    for (let idx = 0; idx < data.attributes.speed.otherSpeeds.length; idx++) {
      const speed = data.attributes.speed.otherSpeeds[idx];
      const base = Number(speed.value ?? 0)
      const modifiers = [];
      [`${speed.type}-speed`, 'speed'].forEach((key) => {
        (statisticsModifiers[(key as any)] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });
      const stat = mergeObject(new PF2StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: speed.label }), modifiers) as any, speed, { overwrite: false });
      stat.total = base + stat.totalModifier;
      stat.breakdown = [`${game.i18n.format('PF2E.SpeedBaseLabel', { type: speed.label })} ${base}`].concat(
        stat.modifiers.filter((m) => m.enabled)
          .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
      ).join(', ');
      data.attributes.speed.otherSpeeds[idx] = stat;
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

        // Determine the base ability score for this attack.
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

        // Conditions and Custom modifiers to attack rolls
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

        const action = new PF2StatisticModifier(item.name, modifiers) as CharacterStrike;

        action.imageUrl = item.img;
        action.glyph = 'A';
        action.type = 'strike';
        const flavor = this.getStrikeDescription(item);
        action.description = flavor.description;
        action.criticalSuccess = flavor.criticalSuccess;
        action.success = flavor.success;

        action.traits = [{ name: 'attack', label: game.i18n.localize('PF2E.TraitAttack'), toggle: false }].concat(
          PF2EActor.traits(item?.data?.traits?.value).map((trait) => {
            const key = CONFIG.weaponTraits[trait] ?? trait;
            const option: CharacterStrikeTrait = {
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

        // Add the base attack roll (used for determining on-hit)
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

    this.prepareInitiative(actorData, statisticsModifiers);

    rules.forEach(rule => {
      try {
          rule.onAfterPrepareData(actorData, statisticsModifiers, damageDice)
      } catch (error) {
          // ensure that a failing rule element does not block actor initialization
          console.error(`PF2e | Failed to execute onAfterPrepareData on rule element ${rule}.`, error);
      }
    });
  }

  prepareInitiative(actorData: CharacterData, statisticsModifiers: Record<string, PF2Modifier[]>) {
    const { data } = actorData;

    const initSkill = data.attributes?.initiative?.ability || 'perception';
    const modifiers: PF2Modifier[] = [];

    // FIXME: this is hard coded for now
    const feats = new Set(actorData.items.filter(item => item.type === 'feat').map(item => item.name));
    if (feats.has('Incredible Initiative')) {
      modifiers.push(new PF2Modifier('Incredible Initiative', 2, PF2ModifierType.CIRCUMSTANCE));
    }
    if (feats.has('Battlefield Surveyor') && initSkill === 'perception') {
      modifiers.push(new PF2Modifier('Battlefield Surveyor', 2, PF2ModifierType.CIRCUMSTANCE));
    }
    if (feats.has('Elven Instincts') && initSkill === 'perception') {
      modifiers.push(new PF2Modifier('Elven Instincts', 2, PF2ModifierType.CIRCUMSTANCE));
    }
    if (feats.has('Eye of Ozem') && initSkill === 'perception') {
      modifiers.push(new PF2Modifier('Eye of Ozem', 2, PF2ModifierType.CIRCUMSTANCE));
    }
    if (feats.has('Harmlessly Cute') && initSkill === 'dec') {
      modifiers.push(new PF2Modifier('Harmlessly Cute', 1, PF2ModifierType.CIRCUMSTANCE));
    }
    ['initiative'].forEach((key) => {
      (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
    });
    const initValues = initSkill === 'perception' ? data.attributes.perception : data.skills[initSkill];
    const skillName = game.i18n.localize(initSkill === 'perception' ? 'PF2E.PerceptionLabel' : CONFIG.skills[initSkill]);
    
    const stat = new PF2CheckModifier('initiative', initValues, modifiers) as InitiativeData;
    stat.ability = initSkill;
    stat.label = game.i18n.format('PF2E.InitiativeWithSkill', { skillName });
    stat.roll = (event, options = []) => {
      PF2Check.roll(new PF2CheckModifier(data.attributes.initiative.label, data.attributes.initiative), { actor: this, type: 'initiative', options }, event, (roll) => {
        this._applyInitiativeRollToCombatTracker(roll);
      });
    };

    data.attributes.initiative = stat;
  }

  _applyInitiativeRollToCombatTracker(roll: Roll) {
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

  /** Obtain the first equipped armor the character has. */
  getFirstWornArmor(): ArmorData {
      return this.data.items.filter((item): item is ArmorData => item.type === 'armor')
          .filter((armor) => armor.data.armorType.value !== 'shield')
          .find((armor) => armor.data.equipped.value);
  }

  /** Obtain the first equipped shield the character has. */
  getFirstEquippedShield(): ArmorData {
      return this.data.items.filter((item): item is ArmorData => item.type === 'armor')
          .filter(armor => armor.data.armorType.value === 'shield')
          .find(shield => shield.data.equipped.value);
  }

  /** Convert a comma-delimited list of traits into an array of traits. */
  static traits(source: string | string[]): string[] {
    if (Array.isArray(source)) {
      return source;
    } else if (typeof source === 'string') {
      return source.split(',').map((trait) => trait.trim());
    }
    return [];
  }

  /* -------------------------------------------- */

  onCreateOwnedItem(child, options, userId) {
    if (!['character', 'npc'].includes(this.data.type)) return;
    const rules = PF2RuleElements.fromRuleElementData(child.data?.rules ?? [], child);
    const updates = {};
    for (const rule of rules) {
      rule.onCreate(<CharacterData|NpcData>this.data, child, updates);
    }
    this.update(updates);
  }

  onDeleteOwnedItem(child, options, userId) {
    if (!['character', 'npc'].includes(this.data.type)) return;
    const rules = PF2RuleElements.fromRuleElementData(child.data?.rules ?? [], child);
    const updates = {};
    for (const rule of rules) {
      rule.onDelete(<CharacterData|NpcData>this.data, child, updates);
    }
    this.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Prepare NPC type specific data
   */
  private _prepareNPCData(actorData: NpcData, rules: PF2RuleElement[]) {
    const { data } = actorData;
    const { statisticsModifiers } = this._prepareCustomModifiers(actorData, rules);

    // Compute 'fake' ability scores from ability modifiers (just in case the scores are required for something)
    for (const abl of Object.values(actorData.data.abilities)) {
      if (!abl.mod) abl.mod = 0;
      abl.value = abl.mod * 2 + 10;
    }

    // Armor Class
    {
      const base: number = data.attributes.ac.base ?? Number(data.attributes.ac.value);
      const dexterity = Math.min(data.abilities.dex.mod, ...(data.attributes.dexCap ?? []).map(cap => cap.value));
      const modifiers = [
        new PF2Modifier('PF2E.BaseModifier', base - 10 - dexterity, PF2ModifierType.UNTYPED),
        new PF2Modifier(CONFIG.abilities.dex, dexterity, PF2ModifierType.ABILITY)
      ];
      ['ac', 'dex-based', 'all'].forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
      });

      const stat = mergeObject(new PF2StatisticModifier("ac", modifiers) as NPCArmorClassData, data.attributes.ac, { overwrite: false });
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

      const stat = mergeObject(new PF2StatisticModifier(saveName, modifiers) as NPCSaveData, data.saves[saveName], { overwrite: false });
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

      const stat = mergeObject(new PF2StatisticModifier('perception', modifiers) as NPCPerceptionData, data.attributes.perception, { overwrite: false });
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

        const stat = mergeObject(new PF2StatisticModifier(item.name, modifiers) as NPCSkillData, data.skills[shortform], { overwrite: false });
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

  private _prepareFamiliarData(actorData: FamiliarData, rules: PF2RuleElement[]) {
    const { data } = actorData;

    let master;
    if (data?.master?.id && game.actors) {
      master = game.actors.get(data.master.id);
    }
    if (master) {
      data.master.name = master?.name;
      data.master.level = master.data.data.details.level.value ?? 0;
      data.details.level.value = data.master.level;

      const { statisticsModifiers } = this._prepareCustomModifiers(actorData, rules);

      // hit points
      {
        const modifiers = [
          new PF2Modifier('PF2E.MasterLevelHP', data.master.level * 5, PF2ModifierType.UNTYPED)
        ];
        (statisticsModifiers.hp || []).map(m => duplicate(m)).forEach(m => modifiers.push(m));
        (statisticsModifiers['hp-per-level'] || []).map(m => duplicate(m)).forEach(m => {
          m.modifier *= data.details.level.value;
          modifiers.push(m)
        });

        const stat = mergeObject<HitPointsData>(new PF2StatisticModifier("hp", modifiers) as HitPointsData, data.attributes.hp, { overwrite: false });
        stat.max = stat.totalModifier;
        stat.value = Math.min(stat.value, stat.max);
        stat.breakdown = stat.modifiers.filter(m => m.enabled)
          .map(m => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
          .join(', ');
        data.attributes.hp = stat;
      }

      // armor class
      {
        const source = master.data.data.attributes.ac.modifiers.filter(modifier => !['status', 'circumstance'].includes(modifier.type));
        const base = 10 + new PF2StatisticModifier('base', source).totalModifier;
        const modifiers = [];
        ['ac', 'dex-based', 'all'].forEach(key => (statisticsModifiers[key] || []).map(m => duplicate(m)).forEach(m => modifiers.push(m)));
        const stat = new PF2StatisticModifier('ac', modifiers);
        stat.value = base + stat.totalModifier;
        stat.breakdown = [game.i18n.format('PF2E.MasterArmorClass', { base })].concat(
          stat.modifiers.filter(m => m.enabled).map(m => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
        ).join(', ');
        data.attributes.ac = stat;
      }

      // saving throws
      for (const [saveName, save] of Object.entries(master.data.data.saves as SaveData[])) {
        const source = save.modifiers.filter(modifier => !['status', 'circumstance'].includes(modifier.type));
        const modifiers = [
          new PF2Modifier(`PF2E.MasterSavingThrow.${saveName}`, new PF2StatisticModifier('base', source).totalModifier, PF2ModifierType.UNTYPED)
        ];
        [save.name, `${save.ability}-based`, 'saving-throw', 'all'].forEach(key => (statisticsModifiers[key] || []).map(m => duplicate(m)).forEach(m => modifiers.push(m)));
        const stat = new PF2StatisticModifier(CONFIG.saves[saveName], modifiers);
        stat.value = stat.totalModifier;
        stat.breakdown = stat.modifiers.filter(m => m.enabled)
          .map(m => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
          .join(', ');
        data.saves[saveName] = stat;
      }
    } else {
      data.master.name = undefined;
      data.master.level = 0;
      data.details.level.value = 0;
      data.attributes.hp = {
        value: data.attributes.hp.value,
        max: data.attributes.hp.value,
      };
      data.attributes.ac = {
        value: 10,
        breakdown: game.i18n.localize('PF2E.ArmorClassBase')
      };
      data.saves = {
        fortitude: { value: 0 },
        reflex: { value: 0 },
        will: { value: 0 }
      };
    }
  }


    /** Compute custom stat modifiers provided by users or given by conditions. */
  private _prepareCustomModifiers(actorData: CharacterData | NpcData | FamiliarData, rules: PF2RuleElement[]): {
    statisticsModifiers: Record<string, PF2Modifier[]>,
    damageDice: Record<string, PF2DamageDice[]>
  } {
    // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
    const statisticsModifiers: Record<string, PF2Modifier[]> = {};
    const damageDice: Record<string, PF2DamageDice[]> = {};

    rules.forEach(rule => {
        try {
            rule.onBeforePrepareData(actorData, statisticsModifiers, damageDice)
        } catch (error) {
            // ensure that a failing rule element does not block actor initialization
            console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
        }
    });

    // Get all of the active conditions (from the item array), and add their modifiers.
    const conditions = actorData.items.filter((i): i is ConditionData => i.flags.pf2e?.condition && i.type === 'condition' && i.data.active);

    for (const [key, value] of PF2eConditionManager.getModifiersFromConditions(conditions.values())) {
      statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
    }

    // Character-specific custom modifiers & custom damage dice.
    if (['character', 'familiar', 'npc'].includes(actorData.type)) {
      const {data} = actorData;

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
    }

    return {
      statisticsModifiers,
      damageDice
    };
  }

  getStrikeDescription(item: WeaponData) {
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
  rollSkill(event: JQuery.Event, skillName: string) {
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
  rollRecovery(event: JQuery.Event) {
    if (this.data.type !== 'character') {
      throw Error("Recovery rolls are only applicable to characters");
    }

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
  rollLoreSkill(event: JQuery.Event, item: PF2EItem) {
    const { data } = item;
    if (data.type !== 'lore') {
      throw Error("Can only roll lore skills using lore items");
    }

    const parts = ['@mod', '@itemBonus'];
    const flavor = `${item.name} Skill Check`;

    let rollMod: number = 0;
    let itemBonus: number = 0;
    if (item.actor && item.actor.data && item.actor.data.type === 'character') {
      const rank = (data.data.proficient?.value || 0);
      const proficiency = ProficiencyModifier.fromLevelAndRank(this.data.data.details.level.value, rank).modifier;
      const modifier = this.data.data.abilities.int.mod;

      itemBonus = Number((data.data.item || {}).value || 0);
      rollMod = modifier + proficiency;
    } else if (item.actor && item.actor.data && item.actor.data.type === 'npc') {
      rollMod = data.data.mod.value;
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
  rollSave(event: JQuery.Event, saveName: string) {
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
  rollAbility(event: JQuery.Event, abilityName: string) {
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
  rollAttribute(event: JQuery.Event, attributeName: string) {
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
   * @param {JQuery} roll    The chat entry which contains the roll data
   * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
   * @return {Promise}
   */
  static async applyDamage(roll: JQuery, multiplier: number, attribute: string = 'attributes.hp', modifier: number = 0) {
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
   * @param {JQuery} roll    The chat entry which contains the roll data
   */
  static async setCombatantInitiative(roll: JQuery) {
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

      // Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
      let value = valueRolled;
      if (!combatant.actor.isPC) {
        value += 0.5;
      }
      const message = `
      <div class="dice-roll">
      <div class="dice-result">
        <div class="dice-tooltip" style="display: none;">
            <div class="dice-formula" style="background: 0;">
              <span style="font-size: 10px;">${skillRolled} <span style="font-weight: bold;">${valueRolled}</span></span>
            </div>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-style:oblique; font-weight: 400;">${combatant.name}'s Initiative is now ${value}!</span>
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
  async importItemFromCollectionWithLocation(collection: string, entryId: string, location?: string) {
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

  async _setShowUnpreparedSpells(entryId: string, spellLevel: number) {
    if (!entryId || !spellLevel) {
      // TODO: Consider throwing an error on null inputs in the future.
      return;
    }

    const spellcastingEntry = this.getOwnedItem(entryId);
    if (spellcastingEntry === null || spellcastingEntry.data.type !== 'spellcastingEntry') {
      return;
    }

    if (spellcastingEntry.data.data?.prepared?.value === "prepared" && spellcastingEntry.data.data?.showUnpreparedSpells?.value === false) {
      if (CONFIG.debug.hooks === true) {
        console.log(`PF2e DEBUG | Updating spellcasting entry ${entryId} set showUnpreparedSpells to true.`);
      }

      const currentLvlToDisplay = {};
      currentLvlToDisplay[spellLevel] = true;
      await this.updateEmbeddedEntity('OwnedItem', {
        _id: entryId,
        'data.showUnpreparedSpells.value': true,
        'data.displayLevels': currentLvlToDisplay
      });
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
   */
  async modifyTokenAttribute(attribute: string, value: number, isDelta: boolean = false, isBar: boolean = true): Promise<PF2EActor> {
    if (value === undefined || value === null || Number.isNaN(value)) {
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
   * Moves an item to another actor's inventory.
   * @param {sourceActor} Instance of actor sending the item.
   * @param {targetActor} Instance of actor to receiving the item.
   * @param {item}        Instance of the item being transferred.
   * @param {quantity}    Number of items to move.
   * @param {containerId} Id of the container that will contain the item.
   */
  static async transferItemToActor(sourceActor: PF2EActor, targetActor: PF2EActor, item: PF2EItem,
                                   quantity: number, containerId: string): Promise<PF2EItem> {
    if (!isPhysicalItem(item.data)) {
      throw Error("Only physical items (with quantities) can be transfered between actors");
    }

    // Limit the amount of items transfered to how many are actually available.
    const sourceItemQuantity = Number(item.data.data.quantity.value);
    quantity = Math.min(quantity, sourceItemQuantity);

    // Remove the item from the source if we are transferring all of it; otherwise, subtract the appropriate number.
    const newItemQuantity = sourceItemQuantity - quantity;
    const hasToRemoveFromSource = newItemQuantity < 1;

    if (hasToRemoveFromSource) {
      await sourceActor.deleteEmbeddedEntity('OwnedItem', item._id);
    } else {
      const update = { '_id': item._id, 'data.quantity.value': newItemQuantity };
      await sourceActor.updateEmbeddedEntity('OwnedItem', update);
    }

    let itemInTargetActor = targetActor.items.find(i => i.name === item.name);

    if (itemInTargetActor !== null) {
      if (!isPhysicalItem(itemInTargetActor.data)) {
        throw Error("Only physical items (with quantities) can be transfered between actors - the target item is not physical");
      }

      // Increase amount of item in target actor if there is already an item with the same name
      const targetItemNewQuantity = Number(itemInTargetActor.data.data.quantity.value) + quantity;
      const update = { '_id': itemInTargetActor._id, 'data.quantity.value': targetItemNewQuantity};
      await targetActor.updateEmbeddedEntity('OwnedItem', update);
    } else {
      // If no item with the same name in the target actor, create new item in the target actor
      const newItemData = duplicate(item);
      if (!isPhysicalItem(newItemData)) {
        console.error(newItemData);
        throw Error("this should never happen - item should be physical, but is not");
      }
      newItemData.data.quantity.value = quantity;

      const result = await targetActor.createOwnedItem(newItemData);
      itemInTargetActor = targetActor.items.get(result._id);
    }

    return PF2EActor.stashOrUnstash(targetActor, async () => itemInTargetActor, containerId);
  }

  /**
   * Moves an item into the inventory into or out of a container.
   * @param {actor}       Actor whose inventory should be edited.
   * @param {getItem}     Lambda returning the item.
   * @param {containerId} Id of the container that will contain the item.
   */
  static async stashOrUnstash(actor: PF2EActor, getItem: () => Promise<PF2EItem>, containerId: string): Promise<PF2EItem> {
      const item = await getItem();
      if (containerId) {
          if (item.type !== 'spell' && !isCycle(item._id, containerId, actor.data.items.filter(isPhysicalItem))) {
              return item.update({
                  'data.containerId.value': containerId,
                  'data.equipped.value': false,
              });
          }
          return item;
      }

      return item.update({'data.containerId.value': ''});
  }

  /**
   * Handle how changes to a Token attribute bar are applied to the Actor.
   * This allows for game systems to override this behavior and deploy special logic.
   */
  _calculateHealthDelta(args: {
    hp: { value: number; temp: number; };
    sp: { value: number; temp: number; };
    delta: number
  }) {
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
   */
  async addCustomModifier(stat: string, name: string, value: number, type: string,
                          predicate?: { all?: string[], any?: string[], not?: string[] }, damageType?: string) {
    // TODO: Consider adding another 'addCustomModifier' function in the future which takes a full PF2Modifier object,
    // similar to how addDamageDice operates.
    if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
      throw Error("Custom modifiers only work for characters, NPCs, and familiars");
    }

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

  /** Removes a custom modifier by name. */
  async removeCustomModifier(stat: string, modifier: number | string) {
    if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
      throw Error("Custom modifiers only work for characters, NPCs, and familiars");
    }

    const customModifiers = duplicate(this.data.data.customModifiers ?? {});
    if (typeof modifier === 'number' && customModifiers[stat] && customModifiers[stat].length > modifier) {
      customModifiers[stat].splice(modifier, 1);
      await this.update({'data.customModifiers': customModifiers});
    } else if (typeof modifier === 'string' && customModifiers[stat]) {
      customModifiers[stat] = customModifiers[stat].filter(m => m.name !== modifier);
      await this.update({'data.customModifiers': customModifiers});
    } else {
      throw Error("Custom modifiers can only be removed by name (string) or index (number)");
    }
  }

  /**
   * Adds a Dexterity modifier cap to AC. The cap with the lowest value will automatically be applied.
   *
   * @param {DexterityModifierCapData} dexCap
   */
  async addDexterityModifierCap(dexCap: DexterityModifierCapData) {
    if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
      throw Error("Custom dexterity caps only work for characters, NPCs, and familiars");
    }
    if (dexCap.value === undefined || typeof dexCap.value !== 'number') {
      throw new Error('numeric value is mandatory');
    }
    if (dexCap.source === undefined || typeof dexCap.source !== 'string') {
      throw new Error('source of cap is mandatory');
    }

    await this.update({'data.attributes.dexCap': (this.data.data.attributes.dexCap ?? []).concat(dexCap)});
  }

  /**
   * Removes a previously added Dexterity modifier cap to AC.
   */
  async removeDexterityModifierCap(source: string) {
    if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
      throw Error("Custom dexterity caps only work for characters, NPCs, and familiars");
    }
    if (!source) {
      throw new Error('source of cap is mandatory');
    }

    // Dexcap may not exist / be unset if no custom dexterity caps have been added before.
    if (this.data.data.attributes.dexCap) {
      const updated = this.data.data.attributes.dexCap.filter(cap => cap.source !== source);
      await this.update({'data.attributes.dexCap': updated});
    }
  }

  /** Adds custom damage dice. */
  async addDamageDice(param: PF2DamageDice) {
    if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
      throw Error("Custom damage dice only work for characters, NPCs, and familiars");
    }

    const damageDice = duplicate(this.data.data.damageDice ?? {});
    if (!(damageDice[param.selector] ?? []).find((d) => d.name === param.name)) {
      // Default new dice to apply to all damage rolls, and ensure we mark this as a custom damage dice source.
      param.selector = param?.selector ?? 'damage';
      param.custom = true;

      // The damage dice constructor performs some basic validations for us, like checking that the
      // name and selector are both defined.
      const dice = new PF2DamageDice(param);

      damageDice[param.selector] = (damageDice[param.selector] ?? []).concat([dice]);
      await this.update({'data.damageDice': damageDice});
    }
  }

  /** Removes damage dice by name. */
  async removeDamageDice(selector: string, dice: number | string) {
    if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
      throw Error("Custom damage dice only work for characters, NPCs, and familiars");
    }

    const damageDice = duplicate(this.data.data.damageDice ?? {});
    if (typeof dice === 'number' && damageDice[selector] && damageDice[selector].length > dice) {
      damageDice[selector].splice(dice, 1);
      await this.update({'data.damageDice': damageDice});
    } else if (typeof dice === 'string' && damageDice[selector]) {
      damageDice[selector] = damageDice[selector].filter(d => d.name !== dice);
      await this.update({'data.damageDice': damageDice});
    } else {
      throw Error("Dice can only be removed by name (string) or index (number)");
    }
  }

  /** Toggle the given roll option (swapping it from true to false, or vice versa). */
  async toggleRollOption(rollName: string, optionName: string) {
    if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
      throw new Error(`${rollName} is not a supported roll`);
    }
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.setFlag(game.system.id, flag, !this.getFlag(game.system.id, flag));
  }

  /** Set the given roll option. */
  async setRollOption(rollName: string, optionName: string, enabled: boolean) {
    if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
      throw new Error(`${rollName} is not a supported roll`);
    }
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.setFlag(game.system.id, flag, !!enabled);
  }

  /** Unset (i.e., delete entirely) the given roll option. */
  async unsetRollOption(rollName: string, optionName: string) {
    const flag = `rollOptions.${rollName}.${optionName}`;
    this.unsetFlag(game.system.id, flag);
  }

  /** Enable the given roll option for thie given roll name. */
  async enableRollOption(rollName: string, optionName: string) {
    this.setRollOption(rollName, optionName, true);
  }

  /** Disable the given roll option for the given roll name. */
  async disableRollOption(rollName: string, optionName: string) {
    this.setRollOption(rollName, optionName, false);
  }

  /** Obtain roll options relevant to rolls of the given types (for use in passing to the `roll` functions on statistics). */
  getRollOptions(rollNames: string[]): string[] {
    const flag: Record<string, Record<string, boolean>> = this.getFlag(game.system.id, 'rollOptions') ?? {};
    return rollNames.flatMap(rollName =>
      // convert flag object to array containing the names of all fields with a truthy value
      Object.entries(flag[rollName] ?? {}).reduce((opts, [key, value]) => opts.concat(value ? key : []), [] as string[])
    ).reduce((unique, option) => {
      // ensure option entries are unique
      return unique.includes(option) ? unique : unique.concat(option);
    }, [] as string[]);
  }
}
