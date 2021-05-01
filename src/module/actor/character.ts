import {
    ConsumableData,
    ItemDataPF2e,
    LoreData,
    SpellAttackRollModifier,
    SpellDifficultyClass,
    WeaponCategoryKey,
    WeaponDamage,
    WeaponData,
} from '@item/data-definitions';
import { ItemPF2e } from '@item/base';
import { getArmorBonus, getResiliencyBonus } from '@item/runes';
import {
    AbilityModifier,
    DEXTERITY,
    ensureProficiencyOption,
    CheckModifier,
    ModifierPF2e,
    ModifierPredicate,
    MODIFIER_TYPE,
    StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from '../modifiers';
import { PF2RuleElement, RuleElements } from '../rules/rules';
import { PF2WeaponDamage } from '@system/damage/weapon';
import { CheckPF2e, PF2DamageRoll } from '@system/rolls';
import { SKILL_DICTIONARY } from './base';
import {
    AbilityString,
    BaseWeaponProficiencyKey,
    CharacterData,
    CharacterStrike,
    CharacterStrikeTrait,
    SkillData,
    SkillAbbreviation,
    RawCharacterData,
    ZeroToFour,
    CombatProficiencies,
    CombatProficiencyKey,
    PerceptionData,
    ProficiencyData,
    WeaponGroupProficiencyKey,
} from './data-definitions';
import { PF2RollNote } from '../notes';
import { PF2MultipleAttackPenalty, PF2WeaponPotency } from '../rules/rules-data-definitions';
import { toNumber } from '@module/utils';
import { adaptRoll } from '@system/rolls';
import { AncestryPF2e } from '@item/ancestry';
import { BackgroundPF2e } from '@item/background';
import { ClassPF2e } from '@item/class';
import { CreaturePF2e } from './creature';
import { LocalizePF2e } from '@module/system/localize';
import { ConfigPF2e } from '@scripts/config';
import { FeatPF2e } from '@item/feat';
import { AutomaticBonusProgression } from '@module/rules/automatic-bonus';

export class CharacterPF2e extends CreaturePF2e {
    get ancestry(): AncestryPF2e | null {
        return this.itemTypes.ancestry[0] ?? null;
    }

    get background(): BackgroundPF2e | null {
        return this.itemTypes.background[0] ?? null;
    }

    get class(): ClassPF2e | null {
        return this.itemTypes.class[0] ?? null;
    }

    get heritage(): FeatPF2e | null {
        return this.itemTypes.feat.find((feat) => feat.featType.value === 'heritage') ?? null;
    }

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }

    /** @override */
    prepareEmbeddedEntities(): void {
        super.prepareEmbeddedEntities();
        this.prepareAncestry();
        this.prepareBackground();
        this.prepareClass();
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const actorData = this.data;

        const rules: PF2RuleElement[] = actorData.items.reduce(
            (accumulated: PF2RuleElement[], current) => accumulated.concat(RuleElements.fromOwnedItem(current)),
            [],
        );
        const { data } = actorData;

        // Compute ability modifiers from raw ability scores.
        for (const abl of Object.values(data.abilities)) {
            abl.mod = Math.floor((abl.value - 10) / 2);
        }

        // Toggles
        (data as any).toggles = {
            actions: [
                {
                    label: 'PF2E.TargetFlatFootedLabel',
                    inputName: `flags.${game.system.id}.rollOptions.all.target:flatFooted`,
                    checked: this.getFlag(game.system.id, 'rollOptions.all.target:flatFooted'),
                },
            ],
        };

        const synthetics = this._prepareCustomModifiers(actorData, rules);
        AutomaticBonusProgression.concatModifiers(actorData.data.details.level.value, synthetics);
        // Extract as separate variables for easier use in this method.
        const { damageDice, statisticsModifiers, strikes, rollNotes } = synthetics;

        // Update experience percentage from raw experience amounts.
        data.details.xp.pct = Math.min(Math.round((data.details.xp.value * 100) / data.details.xp.max), 99.5);

        // PFS Level Bump - check and DC modifiers
        if (data.pfs?.levelBump) {
            statisticsModifiers.all = (statisticsModifiers.all || []).concat(
                new ModifierPF2e('PF2E.PFS.LevelBump', 1, MODIFIER_TYPE.UNTYPED),
            );
        }

        // Calculate HP and SP
        {
            const ancestryHP = data.attributes.ancestryhp ?? 0;
            const classHP = data.attributes.classhp ?? 0;
            const hitPoints = data.attributes.hp;
            const modifiers = hitPoints.modifiers.concat(
                new ModifierPF2e('PF2E.AncestryHP', ancestryHP, MODIFIER_TYPE.UNTYPED),
            );

            if (game.settings.get('pf2e', 'staminaVariant')) {
                const bonusSpPerLevel = data.attributes.levelbonussp * data.details.level.value;
                const halfClassHp = Math.floor(classHP / 2);

                data.attributes.sp.max =
                    (halfClassHp + data.abilities.con.mod) * data.details.level.value +
                    bonusSpPerLevel +
                    data.attributes.flatbonussp;

                modifiers.push(
                    new ModifierPF2e('PF2E.ClassHP', halfClassHp * data.details.level.value, MODIFIER_TYPE.UNTYPED),
                );
            } else {
                modifiers.push(
                    new ModifierPF2e('PF2E.ClassHP', classHP * data.details.level.value, MODIFIER_TYPE.UNTYPED),
                );
                modifiers.push(
                    new ModifierPF2e(
                        'PF2E.AbilityCon',
                        data.abilities.con.mod * data.details.level.value,
                        MODIFIER_TYPE.ABILITY,
                    ),
                );
            }

            if (data.attributes.flatbonushp) {
                modifiers.push(
                    new ModifierPF2e('PF2E.FlatBonusHP', data.attributes.flatbonushp, MODIFIER_TYPE.UNTYPED),
                );
            }
            if (data.attributes.levelbonushp) {
                modifiers.push(
                    new ModifierPF2e(
                        'PF2E.BonusHPperLevel',
                        data.attributes.levelbonushp * data.details.level.value,
                        MODIFIER_TYPE.UNTYPED,
                    ),
                );
            }

            (statisticsModifiers.hp || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            (statisticsModifiers['hp-per-level'] || [])
                .map((m) => duplicate(m))
                .forEach((m) => {
                    m.modifier *= data.details.level.value;
                    modifiers.push(m);
                });

            const stat = mergeObject(new StatisticModifier('hp', modifiers), data.attributes.hp, {
                overwrite: false,
            });

            // PFS Level Bump - hit points
            if (data.pfs?.levelBump) {
                const hitPointsBump = Math.max(10, stat.totalModifier * 0.1);
                stat.push(new ModifierPF2e('PF2E.PFS.LevelBump', hitPointsBump, MODIFIER_TYPE.UNTYPED));
            }

            stat.max = stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');

            data.attributes.hp = stat;
        }

        // Saves
        const worn = this.wornArmor?.data;
        for (const saveName of ['fortitude', 'reflex', 'will'] as const) {
            const save = data.saves[saveName];
            // Base modifiers from ability scores & level/proficiency rank.
            const ability = (save.ability as AbilityString) ?? CONFIG.PF2E.savingThrowDefaultAbilities[saveName];
            const modifiers = [
                AbilityModifier.fromAbilityScore(ability, data.abilities[ability as AbilityString].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, save.rank),
            ];
            const notes = [] as PF2RollNote[];

            // Add resiliency bonuses for wearing armor with a resiliency rune.
            if (worn) {
                const resiliencyBonus = getResiliencyBonus(worn.data);
                if (resiliencyBonus > 0) {
                    modifiers.push(new ModifierPF2e(worn.name, resiliencyBonus, MODIFIER_TYPE.ITEM));
                }
            }

            // Add explicit item bonuses which were set on this save; hopefully this will be superceded
            // by just using custom modifiers in the future.
            if (save.item) {
                modifiers.push(new ModifierPF2e('PF2E.ItemBonusLabel', Number(save.item), MODIFIER_TYPE.ITEM));
            }

            // Add custom modifiers and roll notes relevant to this save.
            [saveName, `${ability}-based`, 'saving-throw', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            // Create a new modifier from the modifiers, then merge in other fields from the old save data, and finally
            // overwrite potentially changed fields.
            const stat = mergeObject(new StatisticModifier(saveName, modifiers), save, { overwrite: false });
            stat.value = stat.totalModifier;
            stat.breakdown = (stat.modifiers as ModifierPF2e[])
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.roll = adaptRoll((args) => {
                const label = game.i18n.format('PF2E.SavingThrowWithName', {
                    saveName: game.i18n.localize(CONFIG.PF2E.saves[saveName]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, save.rank);
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: 'saving-throw', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            });

            data.saves[saveName] = stat;
        }

        // Martial
        for (const skl of Object.values(data.martial)) {
            const proficiency = ProficiencyModifier.fromLevelAndRank(data.details.level.value, skl.rank || 0);
            skl.value = proficiency.modifier;
            skl.breakdown = `${game.i18n.localize(proficiency.name)} ${proficiency.modifier < 0 ? '' : '+'}${
                proficiency.modifier
            }`;
        }

        // Perception
        {
            const proficiencyRank = data.attributes.perception.rank || 0;
            const modifiers = [
                WISDOM.withScore(data.abilities.wis.value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, proficiencyRank),
            ];
            const activeEffects = this.effects.entries.filter((effect) =>
                effect.data.changes.some((change) => change.key.startsWith('data.attributes.perception.rank')),
            );
            modifiers[1].automation.key = activeEffects.length > 0 ? 'data.attributes.perception.rank' : null;
            modifiers[1].automation.enabled = activeEffects.some((effect) => !effect.data.disabled);

            const notes: PF2RollNote[] = [];
            if (data.attributes.perception.item) {
                modifiers.push(
                    new ModifierPF2e(
                        'PF2E.ItemBonusLabel',
                        Number(data.attributes.perception.item),
                        MODIFIER_TYPE.ITEM,
                    ),
                );
            }
            ['perception', 'wis-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new StatisticModifier('perception', modifiers), data.attributes.perception, {
                overwrite: false,
            });
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.value = stat.totalModifier;
            stat.roll = adaptRoll((args) => {
                const label = game.i18n.localize('PF2E.PerceptionCheck');
                const options = args.options ?? [];
                ensureProficiencyOption(options, proficiencyRank);
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: 'perception-check', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            });

            data.attributes.perception = stat;
        }

        // Class DC
        {
            const modifiers = [
                AbilityModifier.fromAbilityScore(
                    data.details.keyability.value,
                    data.abilities[data.details.keyability.value].value,
                ),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.attributes.classDC.rank ?? 0),
            ];
            const notes = [] as PF2RollNote[];
            ['class', `${data.details.keyability.value}-based`, 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new StatisticModifier('PF2E.ClassDCLabel', modifiers), data.attributes.classDC, {
                overwrite: false,
            });
            stat.value = 10 + stat.totalModifier;
            stat.ability = data.details.keyability.value;
            stat.breakdown = [game.i18n.localize('PF2E.ClassDCBase')]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');

            data.attributes.classDC = stat;
        }

        // Armor Class
        {
            const modifiers: ModifierPF2e[] = [];
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
                modifiers.push(new ModifierPF2e(worn.name, getArmorBonus(worn.data), MODIFIER_TYPE.ITEM));
            }

            // proficiency
            modifiers.unshift(
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.martial[proficiency]?.rank ?? 0),
            );

            // Dex modifier limited by the lowest dex cap, for example from armor
            const dexterity = DEXTERITY.withScore(data.abilities.dex.value);
            dexterity.modifier = Math.min(dexterity.modifier, ...dexCap.map((cap) => cap.value));
            modifiers.unshift(dexterity);

            // condition and custom modifiers
            ['ac', 'dex-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });

            const stat = mergeObject(new StatisticModifier('ac', modifiers), data.attributes.ac, {
                overwrite: false,
            });
            stat.value = 10 + stat.totalModifier;
            stat.check = armorCheckPenalty;
            stat.dexCap = dexCap.reduce((result, current) => {
                if (result) {
                    return result.value > current.value ? current : result;
                }
                return current;
            }, null);
            stat.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');

            data.attributes.ac = stat;
        }

        // Shield
        const shield = this.heldShield?.data;
        if (shield) {
            data.attributes.shield.value = shield.data.hp.value;
            data.attributes.shield.max = shield.data.maxHp.value;
        }

        // Skill modifiers

        const skills: Partial<RawCharacterData['skills']> = {}; // rebuild the skills object to clear out any deleted or renamed skills from previous iterations

        for (const [skillName, skill] of Object.entries(data.skills).filter(([shortform, _]) =>
            Object.keys(SKILL_DICTIONARY).includes(shortform),
        )) {
            const modifiers = [
                AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability as AbilityString].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
            ];
            const notes = [] as PF2RollNote[];
            if (skill.item) {
                modifiers.push(new ModifierPF2e('PF2E.ItemBonusLabel', skill.item, MODIFIER_TYPE.ITEM));
            }

            const ignoreArmorCheckPenalty = !(
                worn &&
                worn.data.traits.value.includes('flexible') &&
                ['acr', 'ath'].includes(skillName)
            );
            if (skill.armor && data.attributes.ac.check && data.attributes.ac.check < 0 && ignoreArmorCheckPenalty) {
                modifiers.push(
                    new ModifierPF2e('PF2E.ArmorCheckPenalty', data.attributes.ac.check, MODIFIER_TYPE.UNTYPED),
                );
            }

            // workaround for the shortform skill names
            const expandedName = SKILL_DICTIONARY[skillName as SkillAbbreviation];

            [expandedName, `${skill.ability}-based`, 'skill-check', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            // preserve backwards-compatibility
            const stat: StatisticModifier = mergeObject(new StatisticModifier(expandedName, modifiers), skill, {
                overwrite: false,
            });
            stat.breakdown = stat.modifiers
                .filter((modifier) => modifier.enabled)
                .map((modifier) => {
                    const prefix = modifier.modifier < 0 ? '' : '+';
                    return `${game.i18n.localize(modifier.name)} ${prefix}${modifier.modifier}`;
                })
                .join(', ');
            stat.value = stat.totalModifier;
            stat.notes = notes;
            stat.roll = adaptRoll((args) => {
                const label = game.i18n.format('PF2E.SkillCheckWithName', {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[skillName]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, skill.rank);
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: 'skill-check', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            });

            skills[skillName] = stat;
        }

        // Lore skills
        actorData.items
            .filter((i) => i.type === 'lore')
            .forEach((skill: LoreData) => {
                // normalize skill name to lower-case and dash-separated words
                const shortform = skill.name.toLowerCase().replace(/\s+/g, '-');
                const rank = skill.data.proficient.value;

                const modifiers = [
                    AbilityModifier.fromAbilityScore('int', data.abilities.int.value),
                    ProficiencyModifier.fromLevelAndRank(data.details.level.value, rank),
                ];
                const notes = [] as PF2RollNote[];
                [shortform, `int-based`, 'skill-check', 'all'].forEach((key) => {
                    (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const loreSkill: SkillData = data.skills[shortform];
                const stat = mergeObject(new StatisticModifier(skill.name, modifiers), loreSkill, {
                    overwrite: false,
                });
                stat.itemID = skill._id;
                stat.rank = rank ?? 0;
                stat.shortform = shortform;
                stat.expanded = skill;
                stat.value = stat.totalModifier;
                stat.lore = true;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = adaptRoll((args) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: skill.name });
                    const options = args.options ?? [];
                    ensureProficiencyOption(options, rank);
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options, dc: args.dc, notes },
                        args.event,
                        args.callback,
                    );
                });

                skills[shortform] = stat;
            });

        data.skills = skills as Required<typeof skills>;

        // Speeds
        {
            const label = game.i18n.localize('PF2E.SpeedTypesLand');
            const base = Number(data.attributes.speed.value ?? 0);
            const modifiers: ModifierPF2e[] = [];
            ['land-speed', 'speed'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });
            const stat = mergeObject(
                new StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: label }), modifiers),
                data.attributes.speed,
                { overwrite: false },
            );
            stat.total = base + stat.totalModifier;
            stat.type = 'land';
            stat.breakdown = [`${game.i18n.format('PF2E.SpeedBaseLabel', { type: label })} ${base}`]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');
            data.attributes.speed = stat;
        }
        for (let idx = 0; idx < data.attributes.speed.otherSpeeds.length; idx++) {
            const speed = data.attributes.speed.otherSpeeds[idx];
            const base = Number(speed.value ?? 0);
            const modifiers: ModifierPF2e[] = [];
            [`${speed.type}-speed`, 'speed'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });
            const stat = mergeObject(
                new StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: speed.label }), modifiers),
                speed,
                { overwrite: false },
            );
            stat.total = base + stat.totalModifier;
            stat.breakdown = [`${game.i18n.format('PF2E.SpeedBaseLabel', { type: speed.label })} ${base}`]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');
            data.attributes.speed.otherSpeeds[idx] = stat;
        }

        // Familiar Abilities
        {
            const modifiers: ModifierPF2e[] = [];
            (statisticsModifiers['familiar-abilities'] || [])
                .map((m) => duplicate(m))
                .forEach((m) => modifiers.push(m));

            const stat = mergeObject(
                new StatisticModifier('familiar-abilities', modifiers),
                data.attributes.familiarAbilities,
                { overwrite: false },
            );
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            data.attributes.familiarAbilities = stat;
        }

        // Automatic Actions
        data.actions = [];

        // Strikes
        type ProficienciesBrief = Record<string, { rank: ZeroToFour; name: string }>;
        // Collect offensive combat proficiencies
        const getProficiencies = (
            translationMap: Record<string, string>,
            combatProficiencies: CombatProficiencies,
            prefix: string,
        ): ProficienciesBrief => {
            const keys = Object.keys(combatProficiencies) as CombatProficiencyKey[];
            return keys
                .filter((key) => key.startsWith(prefix) && key.replace(prefix, '') in translationMap)
                .map((key) => ({ key, data: combatProficiencies[key]! }))
                .reduce((accumulated, proficiency) => {
                    if (!Number.isInteger(proficiency.data.rank)) {
                        return accumulated;
                    }
                    return {
                        ...accumulated,
                        [proficiency.key]: {
                            rank: proficiency.data.rank,
                            name: game.i18n.localize(translationMap[proficiency.key.replace(prefix, '')]),
                        },
                    };
                }, {} as ProficienciesBrief);
        };
        const weaponMap = LocalizePF2e.translations.PF2E.Weapon.Base;
        const weaponProficiencies = getProficiencies(weaponMap, data.martial, 'weapon-base-');
        const groupProficiencies = getProficiencies(CONFIG.PF2E.weaponGroups, data.martial, 'weapon-group-');

        // Add any homebrew categories
        const homebrewCategoryKeys = Object.keys(CONFIG.PF2E.weaponCategories).filter(
            (category): category is WeaponCategoryKey =>
                !['simple', 'martial', 'advanced', 'unarmed'].includes(category),
        );
        for (const key of homebrewCategoryKeys) {
            if (!(key in data.martial)) {
                data.martial[key] = {
                    rank: 0,
                    value: 0,
                    breakdown: '',
                };
            }
        }

        const homebrewCategories = homebrewCategoryKeys.reduce(
            (categories, category) =>
                mergeObject(categories, {
                    [category]: {
                        name: CONFIG.PF2E.weaponCategories[category],
                        rank: data.martial[category]?.rank ?? 0,
                    },
                }),
            {} as Partial<Record<WeaponCategoryKey, { name: string; rank: ZeroToFour }>>,
        );

        const proficiencies: Record<string, { name: string; rank: ZeroToFour }> = {
            simple: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.simple),
                rank: data.martial.simple.rank ?? 0,
            },
            martial: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.martial),
                rank: data.martial.martial.rank ?? 0,
            },
            advanced: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.advanced),
                rank: data.martial.advanced.rank ?? 0,
            },
            unarmed: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.unarmed),
                rank: data.martial.unarmed.rank ?? 0,
            },
            ...homebrewCategories,
            ...weaponProficiencies,
            ...groupProficiencies,
        };

        // Always add a basic unarmed strike.
        const unarmed: DeepPartial<WeaponData> & { data: { damage: Partial<WeaponDamage> } } = {
            _id: 'fist',
            name: game.i18n.localize('PF2E.WeaponTypeUnarmed'),
            type: 'weapon',
            img: 'systems/pf2e/icons/features/classes/powerful-fist.webp',
            data: {
                baseItem: null,
                ability: { value: 'str' },
                weaponType: { value: 'unarmed' },
                bonus: { value: 0 },
                damage: { dice: 1, die: 'd4', damageType: 'bludgeoning' },
                group: { value: 'brawling' },
                range: { value: 'melee' },
                strikingRune: { value: '' },
                traits: { value: ['agile', 'finesse', 'nonlethal', 'unarmed'] },
                equipped: {
                    value: true, // consider checking for free hands
                },
            },
        };

        // powerful fist
        const fistFeat = this.itemTypes.feat.find((feat) => feat.slug === 'powerful-fist');
        if (fistFeat) {
            unarmed.name = fistFeat.name;
            unarmed.data.baseItem = 'fist';
            unarmed.data.damage.die = 'd6';
        }

        const ammo = (actorData.items ?? [])
            .filter((item): item is ConsumableData => item.type === 'consumable')
            .filter((item) => item.data.consumableType?.value === 'ammo');

        actorData.items
            .filter((item): item is WeaponData => item.type === 'weapon')
            .concat([unarmed as WeaponData])
            .concat(strikes)
            .forEach((item) => {
                const modifiers: ModifierPF2e[] = [];

                // Determine the base ability score for this attack.
                let ability: AbilityString;
                {
                    ability = item.data.ability?.value || 'str'; // default to Str
                    let score = data.abilities[ability]?.value ?? 0;
                    // naive check for finesse, which should later be changed to take conditions like
                    // enfeebled and clumsy into consideration
                    if (
                        item.data.traits.value.includes('finesse') &&
                        data.abilities.dex.mod > data.abilities[ability].mod
                    ) {
                        ability = 'dex';
                        score = data.abilities.dex.value;
                    }
                    modifiers.push(AbilityModifier.fromAbilityScore(ability, score));
                }

                const baseWeapon = item.data.baseItem ?? item.data.slug;
                const baseWeaponRank = proficiencies[`weapon-base-${baseWeapon}`]?.rank;
                const groupRank = proficiencies[`weapon-group-${item.data.group.value}`]?.rank;
                const proficiencyRank = Math.max(
                    proficiencies[item.data.weaponType.value ?? '']?.rank ?? 0,
                    baseWeaponRank ?? 0,
                    groupRank ?? 0,
                );
                modifiers.push(ProficiencyModifier.fromLevelAndRank(data.details.level.value, proficiencyRank));

                const selectors = [
                    'attack',
                    'mundane-attack',
                    `${ability}-attack`,
                    `${ability}-based`,
                    `${item._id}-attack`,
                    `${item.name.slugify('-', true)}-attack`,
                    'attack-roll',
                    'all',
                ];

                const itemGroup = item.data.group.value ?? '';
                if (itemGroup) {
                    selectors.push(`${itemGroup.toLowerCase()}-weapon-group-attack`);
                }

                const traits = item.data.traits.value;
                const melee =
                    ['melee', 'reach', ''].includes(item.data.range?.value?.trim()) ||
                    traits.some((t) => t.startsWith('thrown'));
                const defaultOptions = this.getRollOptions(['all', 'attack-roll'])
                    .concat(...traits) // always add weapon traits as options
                    .concat(melee ? 'melee' : 'ranged')
                    .concat(`${ability}-attack`);
                ensureProficiencyOption(defaultOptions, proficiencyRank);
                const notes = [] as PF2RollNote[];

                if (item.data.group?.value === 'bomb') {
                    const attackBonus = toNumber(item.data?.bonus?.value) ?? 0;
                    if (attackBonus !== 0) {
                        modifiers.push(new ModifierPF2e('PF2E.ItemBonusLabel', attackBonus, MODIFIER_TYPE.ITEM));
                    }
                }

                // Conditions and Custom modifiers to attack rolls
                let weaponPotency: { label: string; bonus: number };
                const multipleAttackPenalty = ItemPF2e.calculateMap(item);
                {
                    const potency: PF2WeaponPotency[] = [];
                    const multipleAttackPenalties: PF2MultipleAttackPenalty[] = [];
                    selectors.forEach((key) => {
                        (statisticsModifiers[key] ?? [])
                            .map((m) => duplicate(m))
                            .forEach((m) => {
                                m.ignored = !ModifierPredicate.test(m.predicate, defaultOptions);
                                modifiers.push(m);
                            });
                        (synthetics.weaponPotency[key] ?? [])
                            .filter((wp) => ModifierPredicate.test(wp.predicate, defaultOptions))
                            .forEach((wp) => potency.push(wp));
                        (synthetics.multipleAttackPenalties[key] ?? [])
                            .filter((map) => ModifierPredicate.test(map.predicate, defaultOptions))
                            .forEach((map) => multipleAttackPenalties.push(map));
                        (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                    });

                    // find best weapon potency
                    const potencyRune = toNumber(item.data?.potencyRune?.value) ?? 0;
                    if (potencyRune) {
                        potency.push({ label: 'PF2E.PotencyRuneLabel', bonus: potencyRune });
                    }
                    if (potency.length > 0) {
                        weaponPotency = potency.reduce(
                            (highest, current) => (highest.bonus > current.bonus ? highest : current),
                            potency[0],
                        );
                        modifiers.push(new ModifierPF2e(weaponPotency.label, weaponPotency.bonus, MODIFIER_TYPE.ITEM));
                    }

                    // find lowest multiple attack penalty
                    multipleAttackPenalties.push({
                        label: 'PF2E.MultipleAttackPenalty',
                        penalty: multipleAttackPenalty.map2,
                    });
                    const { label, penalty } = multipleAttackPenalties.reduce(
                        (lowest, current) => (lowest.penalty > current.penalty ? lowest : current),
                        multipleAttackPenalties[0],
                    );
                    multipleAttackPenalty.label = label;
                    multipleAttackPenalty.map2 = penalty;
                    multipleAttackPenalty.map3 = penalty * 2;
                }

                const flavor = this.getStrikeDescription(item);
                const action: CharacterStrike = mergeObject(new StatisticModifier(item.name, modifiers), {
                    imageUrl: item.img,
                    item: item._id,
                    ready: item.data.equipped.value ?? false,
                    glyph: 'A',
                    type: 'strike' as const,
                    description: flavor.description,
                    criticalSuccess: flavor.criticalSuccess,
                    success: flavor.success,
                    options: item.data.options?.value ?? [],
                    traits: [],
                    variants: [],
                    selectedAmmoId: item.data.selectedAmmoId,
                });

                if (['bow', 'sling', 'dart'].includes(itemGroup)) {
                    action.ammo = ammo;
                }

                action.traits = [
                    { name: 'attack', label: game.i18n.localize('PF2E.TraitAttack'), toggle: false },
                ].concat(
                    item.data.traits.value.map((trait) => {
                        const key = CONFIG.PF2E.weaponTraits[trait] ?? trait;
                        const option: CharacterStrikeTrait = {
                            name: trait,
                            label: game.i18n.localize(key),
                            toggle: false,
                            description:
                                CONFIG.PF2E.traitsDescriptions[
                                    trait as keyof ConfigPF2e['PF2E']['traitsDescriptions']
                                ] ?? '',
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
                            option.cssClass = this.getRollOptions([option.rollName]).includes(option.rollOption)
                                ? 'toggled-on'
                                : 'toggled-off';
                        }
                        return option;
                    }),
                );

                action.breakdown = action.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');

                const strikeLabel = game.i18n.localize('PF2E.WeaponStrikeLabel');

                // Add the base attack roll (used for determining on-hit)
                action.attack = adaptRoll((args) => {
                    const options = (args.options ?? []).concat(defaultOptions);
                    CheckPF2e.roll(
                        new CheckModifier(`${strikeLabel}: ${action.name}`, action),
                        { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                        args.event,
                        args.callback,
                    );
                });
                action.roll = action.attack;

                action.variants = [
                    {
                        label: `${game.i18n.localize('PF2E.RuleElement.Strike')}
                            ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
                        roll: adaptRoll((args) => {
                            const options = (args.options ?? []).concat(defaultOptions);
                            CheckPF2e.roll(
                                new CheckModifier(`${strikeLabel}: ${action.name}`, action),
                                { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                                args.event,
                                args.callback,
                            );
                        }),
                    },
                    {
                        label: `${game.i18n.localize('PF2E.MAPAbbreviationLabel')} ${multipleAttackPenalty.map2}`,
                        roll: adaptRoll((args) => {
                            const options = (args.options ?? []).concat(defaultOptions);
                            CheckPF2e.roll(
                                new CheckModifier(`Strike: ${action.name}`, action, [
                                    new ModifierPF2e(
                                        multipleAttackPenalty.label,
                                        multipleAttackPenalty.map2,
                                        MODIFIER_TYPE.UNTYPED,
                                    ),
                                ]),
                                { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                                args.event,
                                args.callback,
                            );
                        }),
                    },
                    {
                        label: `${game.i18n.localize('PF2E.MAPAbbreviationLabel')} ${multipleAttackPenalty.map3}`,
                        roll: adaptRoll((args) => {
                            const options = (args.options ?? []).concat(defaultOptions);
                            CheckPF2e.roll(
                                new CheckModifier(`Strike: ${action.name}`, action, [
                                    new ModifierPF2e(
                                        multipleAttackPenalty.label,
                                        multipleAttackPenalty.map3,
                                        MODIFIER_TYPE.UNTYPED,
                                    ),
                                ]),
                                { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                                args.event,
                                args.callback,
                            );
                        }),
                    },
                ];
                action.damage = adaptRoll((args) => {
                    const options = (args.options ?? []).concat(action.options);
                    const damage = PF2WeaponDamage.calculate(
                        item,
                        actorData,
                        action.traits,
                        statisticsModifiers,
                        damageDice,
                        proficiencies[item.data.weaponType.value ?? '']?.rank ?? 0,
                        options,
                        rollNotes,
                        weaponPotency,
                        synthetics.striking,
                    );
                    PF2DamageRoll.roll(
                        damage,
                        { type: 'damage-roll', outcome: 'success', options },
                        args.event,
                        args.callback,
                    );
                });
                action.critical = adaptRoll((args) => {
                    const options = (args.options ?? []).concat(action.options);
                    const damage = PF2WeaponDamage.calculate(
                        item,
                        actorData,
                        action.traits,
                        statisticsModifiers,
                        damageDice,
                        proficiencies[item.data.weaponType.value ?? '']?.rank ?? 0,
                        options,
                        rollNotes,
                        weaponPotency,
                        synthetics.striking,
                    );
                    PF2DamageRoll.roll(
                        damage,
                        { type: 'damage-roll', outcome: 'criticalSuccess', options },
                        args.event,
                        args.callback,
                    );
                });
                data.actions.push(action);
            });

        this.itemTypes.spellcastingEntry.forEach((item) => {
            const spellcastingEntry = item.data;
            const tradition = spellcastingEntry.data.tradition.value;
            const rank = spellcastingEntry.data.proficiency.value;
            const ability = (spellcastingEntry.data.ability.value || 'int') as AbilityString;
            const baseModifiers = [
                AbilityModifier.fromAbilityScore(ability, data.abilities[ability].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, rank),
            ];
            const baseNotes = [] as PF2RollNote[];
            [`${ability}-based`, 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => baseModifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => baseNotes.push(n));
            });

            {
                // add custom modifiers and roll notes relevant to the attack modifier for the spellcasting entry
                const modifiers = [...baseModifiers];
                const notes = [...baseNotes];
                [`${tradition}-spell-attack`, 'spell-attack', 'attack', 'attack-roll'].forEach((key) => {
                    (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const attack: StatisticModifier & Partial<SpellAttackRollModifier> = new StatisticModifier(
                    spellcastingEntry.name,
                    modifiers,
                );
                attack.notes = notes;
                attack.value = attack.totalModifier;
                attack.breakdown = attack.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                attack.roll = adaptRoll((args) => {
                    const label = game.i18n.format(`PF2E.SpellAttack.${tradition}`);
                    const options = args.options ?? [];
                    ensureProficiencyOption(options, rank);
                    CheckPF2e.roll(
                        new CheckModifier(label, attack, args.modifiers ?? []),
                        { actor: this, type: 'spell-attack-roll', options, dc: args.dc, notes },
                        args.event,
                        args.callback,
                    );
                });
                spellcastingEntry.data.attack = attack as Required<SpellAttackRollModifier>;
            }

            {
                // add custom modifiers and roll notes relevant to the DC for the spellcasting entry
                const modifiers = [...baseModifiers];
                const notes = [...baseNotes];
                [`${tradition}-spell-dc`, 'spell-dc'].forEach((key) => {
                    (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const dc: StatisticModifier & Partial<SpellDifficultyClass> = new StatisticModifier(
                    spellcastingEntry.name,
                    modifiers,
                );
                dc.notes = notes;
                dc.value = 10 + dc.totalModifier;
                dc.breakdown = [game.i18n.localize('PF2E.SpellDCBase')]
                    .concat(
                        dc.modifiers
                            .filter((m) => m.enabled)
                            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                    )
                    .join(', ');
                spellcastingEntry.data.dc = dc as Required<SpellDifficultyClass>;
            }
        });

        this.prepareInitiative(actorData, statisticsModifiers, rollNotes);

        rules.forEach((rule) => {
            try {
                rule.onAfterPrepareData(actorData, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onAfterPrepareData on rule element ${rule}.`, error);
            }
        });
    }

    private prepareInitiative(
        actorData: CharacterData,
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        rollNotes: Record<string, PF2RollNote[]>,
    ) {
        const { data } = actorData;
        const initSkill = data.attributes?.initiative?.ability || 'perception';
        const modifiers: ModifierPF2e[] = [];
        const notes: PF2RollNote[] = [];

        ['initiative'].forEach((key) => {
            const skillFullName = SKILL_DICTIONARY[initSkill as SkillAbbreviation] ?? initSkill;
            (statisticsModifiers[key] || [])
                .map((m) => duplicate(m))
                .forEach((m) => {
                    // checks if predicated rule is true with only skill name option
                    if (m.predicate && ModifierPredicate.test(m.predicate, [skillFullName])) {
                        // toggles these so the predicate rule will be included when totalmodifier is calculated
                        m.enabled = true;
                        m.ignored = false;
                    }
                    modifiers.push(m);
                });
            (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
        });
        const initStat: PerceptionData | SkillData =
            initSkill === 'perception' ? data.attributes.perception : data.skills[initSkill as SkillAbbreviation];
        const skillName = game.i18n.localize(
            initSkill === 'perception' ? 'PF2E.PerceptionLabel' : CONFIG.PF2E.skills[initSkill as SkillAbbreviation],
        );

        const stat = new CheckModifier('initiative', initStat, modifiers);
        stat.ability = initSkill;
        stat.label = game.i18n.format('PF2E.InitiativeWithSkill', { skillName });
        stat.roll = adaptRoll((args) => {
            const skillFullName = SKILL_DICTIONARY[stat.ability as SkillAbbreviation] ?? 'perception';
            const options = args.options ?? [];
            // push skill name to options if not already there
            if (!options.includes(skillFullName)) {
                options.push(skillFullName);
            }
            ensureProficiencyOption(options, initStat.rank ?? -1);
            CheckPF2e.roll(
                new CheckModifier(data.attributes.initiative.label, data.attributes.initiative),
                { actor: this, type: 'initiative', options, notes, dc: args.dc },
                args.event,
                (roll) => {
                    this._applyInitiativeRollToCombatTracker(roll);
                },
            );
        });

        data.attributes.initiative = stat;
    }

    private prepareAncestry() {
        const ancestry = this.ancestry;
        if (ancestry) {
            const actorData = this.data;
            actorData.data.details.ancestry.value = ancestry.name;
            actorData.data.attributes.ancestryhp = ancestry.hitPoints;
            actorData.data.attributes.speed.value = String(ancestry.speed);
            actorData.data.traits.size.value = ancestry.size;

            // Add traits from ancestry and heritage
            const ancestryTraits: Set<string> = ancestry?.traits ?? new Set();
            const heritageTraits: Set<string> = this.heritage?.traits ?? new Set();
            const traitSet = new Set(
                [...ancestryTraits, ...heritageTraits].filter(
                    (trait) => !['common', 'versatile heritage'].includes(trait),
                ),
            );
            for (const trait of Array.from(traitSet).sort()) {
                this.data.data.traits.traits.value.push(trait);
            }
        }
    }

    private prepareBackground() {
        this.data.data.details.background.value = this.background?.name ?? '';
    }

    private prepareClass(): void {
        const classItem = this.class;

        if (classItem) {
            this.data.data.details.class.value = classItem.name;
            this.data.data.attributes.classhp = classItem.hpPerLevel;
        }
    }

    /** Add a proficiency in a weapon group or base weapon */
    async addCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey) {
        const currentProficiencies = this.data.data.martial;
        if (key in currentProficiencies) return;
        const newProficiency: ProficiencyData = { rank: 0, value: 0, breakdown: '', custom: true };
        await this.update({ [`data.martial.${key}`]: newProficiency });
    }

    async removeCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey) {
        await this.update({ [`data.martial.-=${key}`]: null });
    }

    /** @override */
    protected _onCreateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        child: ActiveEffectData,
        options: EntityCreateOptions,
        userId: string,
    ): void;
    protected _onCreateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        child: ItemDataPF2e,
        options: EntityCreateOptions,
        userId: string,
    ): void;
    protected _onCreateEmbeddedEntity(
        embeddedName: 'ActiveEffect' | 'OwnedItem',
        child: ActiveEffectData | ItemDataPF2e,
        options: EntityCreateOptions,
        userId: string,
    ): void;
    protected _onCreateEmbeddedEntity(
        embeddedName: 'ActiveEffect' | 'OwnedItem',
        child: ActiveEffectData | ItemDataPF2e,
        options: EntityCreateOptions,
        userId: string,
    ): void {
        super._onCreateEmbeddedEntity(embeddedName, child, options, userId);

        if (game.user.id === userId) {
            const item = this.items.get(child._id);
            if (item instanceof AncestryPF2e || item instanceof BackgroundPF2e || item instanceof ClassPF2e) {
                item.addFeatures(this);
            }
        }
    }
}

export interface CharacterPF2e {
    data: CharacterData;
    _data: CharacterData;
}
