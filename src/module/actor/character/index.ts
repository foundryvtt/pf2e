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
} from '@module/modifiers';
import { RuleElementPF2e, RuleElements } from '@module/rules/rules';
import { ensureWeaponCategory, ensureWeaponSize, WeaponDamagePF2e } from '@system/damage/weapon';
import { CheckPF2e, DamageRollPF2e, RollParameters } from '@system/rolls';
import { SKILL_DICTIONARY } from '../data/values';
import {
    BaseWeaponProficiencyKey,
    CharacterData,
    CharacterProficiencyData,
    CharacterStrike,
    CharacterSystemData,
    CombatProficiencies,
    CombatProficiencyKey,
    WeaponGroupProficiencyKey,
} from './data';
import { RollNotePF2e } from '@module/notes';
import { MultipleAttackPenaltyPF2e, WeaponPotencyPF2e } from '@module/rules/rules-data-definitions';
import { ErrorPF2e, toNumber } from '@module/utils';
import { AncestryPF2e } from '@item/ancestry';
import { BackgroundPF2e } from '@item/background';
import { ClassPF2e } from '@item/class';
import { CreaturePF2e } from '../index';
import { LocalizePF2e } from '@module/system/localize';
import { FeatPF2e } from '@item/feat';
import { AutomaticBonusProgression } from '@module/rules/automatic-bonus';
import { SpellAttackRollModifier, SpellDifficultyClass } from '@item/spellcasting-entry/data';
import { WeaponCategory, WeaponDamage, WeaponData } from '@item/weapon/data';
import { ZeroToFour } from '@module/data';
import { AbilityString, DexterityModifierCapData, PerceptionData, StrikeTrait } from '@actor/data/base';
import { SkillAbbreviation, SkillData } from '@actor/creature/data';
import { ArmorCategory } from '@item/armor/data';
import { ActiveEffectPF2e } from '@module/active-effect';

export class CharacterPF2e extends CreaturePF2e {
    static override get schema(): typeof CharacterData {
        return CharacterData;
    }

    get ancestry(): Embedded<AncestryPF2e> | null {
        return this.itemTypes.ancestry[0] ?? null;
    }

    get background(): Embedded<BackgroundPF2e> | null {
        return this.itemTypes.background[0] ?? null;
    }

    get class(): Embedded<ClassPF2e> | null {
        return this.itemTypes.class[0] ?? null;
    }

    get heritage(): Embedded<FeatPF2e> | null {
        return this.itemTypes.feat.find((feat) => feat.featType.value === 'heritage') ?? null;
    }

    get keyAbility(): AbilityString {
        return this.data.data.details.keyability.value || 'str';
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Add any homebrew categories
        const { data } = this.data;
        const homebrewCategories = game.settings.get('pf2e', 'homebrew.weaponCategories').map((tag) => tag.id);
        for (const category of homebrewCategories) {
            data.martial[category] ??= {
                rank: 0,
                value: 0,
                breakdown: '',
            };
        }

        // Toggles
        this.data.data.toggles = {
            actions: [
                {
                    label: 'PF2E.TargetFlatFootedLabel',
                    inputName: `flags.pf2e.rollOptions.all.target:flatFooted`,
                    checked: this.getFlag('pf2e', 'rollOptions.all.target:flatFooted'),
                },
            ],
        };
    }

    /** Adjustments from ABC items are made after all items are prepared but before active effects are applied. */
    override applyActiveEffects(): void {
        this.ancestry?.prepareActorData();
        this.class?.prepareActorData();
        super.applyActiveEffects();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const rules = this.items
            .reduce((rules: RuleElementPF2e[], item) => rules.concat(RuleElements.fromOwnedItem(item.data)), [])
            .filter((rule) => !rule.ignored);
        const systemData = this.data.data;

        // Compute ability modifiers from raw ability scores.
        for (const abl of Object.values(systemData.abilities)) {
            abl.mod = Math.floor((abl.value - 10) / 2);
        }

        const synthetics = this.prepareCustomModifiers(rules);
        if (!this.getFlag('pf2e', 'disableABP')) {
            AutomaticBonusProgression.concatModifiers(this.level, synthetics);
        }
        // Extract as separate variables for easier use in this method.
        const { damageDice, statisticsModifiers, strikes, rollNotes } = synthetics;

        // Update experience percentage from raw experience amounts.
        systemData.details.xp.pct = Math.min(
            Math.round((systemData.details.xp.value * 100) / systemData.details.xp.max),
            99.5,
        );

        // Set dying, doomed, and wounded statuses according to embedded conditions
        for (const conditionName of ['dying', 'doomed', 'wounded'] as const) {
            const condition = this.itemTypes.condition.find((condition) => condition.slug === conditionName);
            const status = systemData.attributes[conditionName];
            status.value = Math.min(condition?.value ?? 0, status.max);
        }

        // PFS Level Bump - check and DC modifiers
        if (systemData.pfs?.levelBump) {
            statisticsModifiers.all = (statisticsModifiers.all || []).concat(
                new ModifierPF2e('PF2E.PFS.LevelBump', 1, MODIFIER_TYPE.UNTYPED),
            );
        }

        // Calculate HP and SP
        {
            const hitPoints = systemData.attributes.hp;
            const modifiers = [...hitPoints.modifiers];

            if (game.settings.get('pf2e', 'staminaVariant')) {
                const bonusSpPerLevel = (systemData.attributes.levelbonussp ?? 1) * this.level;
                const halfClassHp = Math.floor((this.class?.hpPerLevel ?? 0) / 2);
                systemData.attributes.sp.max =
                    (halfClassHp + systemData.abilities.con.mod) * this.level +
                    bonusSpPerLevel +
                    systemData.attributes.flatbonussp;
            } else {
                modifiers.push(
                    new ModifierPF2e(
                        'PF2E.AbilityCon',
                        systemData.abilities.con.mod * this.level,
                        MODIFIER_TYPE.ABILITY,
                    ),
                );
            }

            if (systemData.attributes.flatbonushp) {
                modifiers.push(
                    new ModifierPF2e('PF2E.FlatBonusHP', systemData.attributes.flatbonushp, MODIFIER_TYPE.UNTYPED),
                );
            }
            if (systemData.attributes.levelbonushp) {
                modifiers.push(
                    new ModifierPF2e(
                        'PF2E.BonusHPperLevel',
                        systemData.attributes.levelbonushp * this.level,
                        MODIFIER_TYPE.UNTYPED,
                    ),
                );
            }

            (statisticsModifiers.hp || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            (statisticsModifiers['hp-per-level'] || [])
                .map((m) => duplicate(m))
                .forEach((m) => {
                    m.modifier *= this.level;
                    modifiers.push(m);
                });

            // Delete data.attributes.hp.modifiers field that breaks mergeObject and is no longer needed at this point
            const hpData = duplicate(hitPoints);
            delete (hpData as any).modifiers;

            const stat = mergeObject(new StatisticModifier('hp', modifiers), hpData, { overwrite: false });

            // PFS Level Bump - hit points
            if (systemData.pfs?.levelBump) {
                const hitPointsBump = Math.max(10, stat.totalModifier * 0.1);
                stat.push(new ModifierPF2e('PF2E.PFS.LevelBump', hitPointsBump, MODIFIER_TYPE.UNTYPED));
            }

            stat.max = stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');

            systemData.attributes.hp = stat;
        }

        // Saves
        const worn = this.wornArmor?.data;
        for (const saveName of ['fortitude', 'reflex', 'will'] as const) {
            const save = systemData.saves[saveName];
            // Base modifiers from ability scores & level/proficiency rank.
            const ability = save.ability ?? CONFIG.PF2E.savingThrowDefaultAbilities[saveName];
            const modifiers = [
                AbilityModifier.fromAbilityScore(ability, systemData.abilities[ability].value),
                ProficiencyModifier.fromLevelAndRank(this.level, save.rank),
            ];
            const notes: RollNotePF2e[] = [];

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
            stat.notes = notes;
            stat.value = stat.totalModifier;
            stat.breakdown = (stat.modifiers as ModifierPF2e[])
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.roll = (args: RollParameters) => {
                const label = game.i18n.format('PF2E.SavingThrowWithName', {
                    saveName: game.i18n.localize(CONFIG.PF2E.saves[saveName]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, save.rank);
                if (args.dc !== undefined && stat.adjustments !== undefined) {
                    args.dc.adjustments = stat.adjustments;
                }
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: 'saving-throw', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            };

            systemData.saves[saveName] = stat;
        }

        // Martial
        for (const skl of Object.values(systemData.martial)) {
            const proficiency = ProficiencyModifier.fromLevelAndRank(this.level, skl.rank || 0);
            skl.value = proficiency.modifier;
            skl.breakdown = `${game.i18n.localize(proficiency.name)} ${proficiency.modifier < 0 ? '' : '+'}${
                proficiency.modifier
            }`;
        }

        // Perception
        {
            const proficiencyRank = systemData.attributes.perception.rank || 0;
            const modifiers = [
                WISDOM.withScore(systemData.abilities.wis.value),
                ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank),
            ];
            const activeEffects = this.effects.contents.filter((effect) =>
                effect.data.changes.some((change) => change.key.startsWith('data.attributes.perception.rank')),
            );
            modifiers[1].automation.key = activeEffects.length > 0 ? 'data.attributes.perception.rank' : null;
            modifiers[1].automation.enabled = activeEffects.some((effect) => !effect.data.disabled);

            const notes: RollNotePF2e[] = [];
            if (systemData.attributes.perception.item) {
                modifiers.push(
                    new ModifierPF2e(
                        'PF2E.ItemBonusLabel',
                        Number(systemData.attributes.perception.item),
                        MODIFIER_TYPE.ITEM,
                    ),
                );
            }
            ['perception', 'wis-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new StatisticModifier('perception', modifiers), systemData.attributes.perception, {
                overwrite: false,
            });
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.notes = notes;
            stat.value = stat.totalModifier;
            stat.roll = (args: RollParameters) => {
                const label = game.i18n.localize('PF2E.PerceptionCheck');
                const options = args.options ?? [];
                ensureProficiencyOption(options, proficiencyRank);
                if (args.dc !== undefined && stat.adjustments !== undefined) {
                    args.dc.adjustments = stat.adjustments;
                }
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: 'perception-check', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            };

            systemData.attributes.perception = stat;
        }

        // Class DC
        {
            const modifiers = [
                AbilityModifier.fromAbilityScore(
                    systemData.details.keyability.value,
                    systemData.abilities[systemData.details.keyability.value].value,
                ),
                ProficiencyModifier.fromLevelAndRank(this.level, systemData.attributes.classDC.rank ?? 0),
            ];
            const notes: RollNotePF2e[] = [];
            ['class', `${systemData.details.keyability.value}-based`, 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(
                new StatisticModifier('PF2E.ClassDCLabel', modifiers),
                systemData.attributes.classDC,
                {
                    overwrite: false,
                },
            );
            stat.value = 10 + stat.totalModifier;
            stat.ability = systemData.details.keyability.value;
            stat.breakdown = [game.i18n.localize('PF2E.ClassDCBase')]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');

            systemData.attributes.classDC = stat;
        }

        // Armor Class
        {
            const modifiers: ModifierPF2e[] = [];
            const dexCap = duplicate(systemData.attributes.dexCap ?? []);
            let armorCheckPenalty = 0;
            let proficiency: ArmorCategory = 'unarmored';

            if (worn) {
                dexCap.push({ value: Number(worn.data.dex.value ?? 0), source: worn.name });
                proficiency = worn.data.armorType.value;
                // armor check penalty
                if (systemData.abilities.str.value < Number(worn.data.strength.value ?? 0)) {
                    armorCheckPenalty = Number(worn.data.check.value ?? 0);
                }
                const armorBonus = worn.isInvested === false ? worn.data.armor.value : getArmorBonus(worn.data);
                modifiers.push(new ModifierPF2e(worn.name, armorBonus, MODIFIER_TYPE.ITEM));
            }

            // proficiency
            modifiers.unshift(
                ProficiencyModifier.fromLevelAndRank(this.level, systemData.martial[proficiency]?.rank ?? 0),
            );

            // Dex modifier limited by the lowest dex cap, for example from armor
            const dexterity = DEXTERITY.withScore(systemData.abilities.dex.value);
            dexterity.modifier = Math.min(dexterity.modifier, ...dexCap.map((cap) => cap.value));
            modifiers.unshift(dexterity);

            // condition and custom modifiers
            ['ac', 'dex-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });

            const stat = mergeObject(new StatisticModifier('ac', modifiers), systemData.attributes.ac, {
                overwrite: false,
            });
            stat.value = 10 + stat.totalModifier;
            stat.check = armorCheckPenalty;
            stat.dexCap = dexCap.reduce((result: DexterityModifierCapData | undefined, current) => {
                if (result) {
                    return result.value > current.value ? current : result;
                }
                return current;
            }, undefined);
            stat.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')]
                .concat(
                    stat.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                )
                .join(', ');

            systemData.attributes.ac = stat;
        }

        // Shield
        const shield = this.heldShield?.data;
        if (shield) {
            systemData.attributes.shield.value = shield.data.hp.value;
            systemData.attributes.shield.max = shield.data.maxHp.value;
        }

        // Skill modifiers

        const skills: Partial<CharacterSystemData['skills']> = {}; // rebuild the skills object to clear out any deleted or renamed skills from previous iterations

        for (const [skillName, skill] of Object.entries(systemData.skills).filter(([shortform, _]) =>
            Object.keys(SKILL_DICTIONARY).includes(shortform),
        )) {
            const modifiers = [
                AbilityModifier.fromAbilityScore(
                    skill.ability,
                    systemData.abilities[skill.ability as AbilityString].value,
                ),
                ProficiencyModifier.fromLevelAndRank(this.level, skill.rank),
            ];
            const notes: RollNotePF2e[] = [];
            if (skill.item) {
                modifiers.push(new ModifierPF2e('PF2E.ItemBonusLabel', skill.item, MODIFIER_TYPE.ITEM));
            }

            const ignoreArmorCheckPenalty = !(
                worn &&
                worn.data.traits.value.includes('flexible') &&
                ['acr', 'ath'].includes(skillName)
            );
            if (
                skill.armor &&
                systemData.attributes.ac.check &&
                systemData.attributes.ac.check < 0 &&
                ignoreArmorCheckPenalty
            ) {
                modifiers.push(
                    new ModifierPF2e('PF2E.ArmorCheckPenalty', systemData.attributes.ac.check, MODIFIER_TYPE.UNTYPED),
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
            stat.roll = (args: RollParameters) => {
                const label = game.i18n.format('PF2E.SkillCheckWithName', {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[skillName]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, skill.rank);
                if (args.dc !== undefined && stat.adjustments !== undefined) {
                    args.dc.adjustments = stat.adjustments;
                }
                CheckPF2e.roll(
                    new CheckModifier(label, stat),
                    { actor: this, type: 'skill-check', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            };

            skills[skillName] = stat;
        }

        // Lore skills
        this.itemTypes.lore
            .map((loreItem) => loreItem.data)
            .forEach((skill) => {
                // normalize skill name to lower-case and dash-separated words
                const shortform = skill.name.toLowerCase().replace(/\s+/g, '-') as SkillAbbreviation;
                const rank = skill.data.proficient.value;

                const modifiers = [
                    AbilityModifier.fromAbilityScore('int', systemData.abilities.int.value),
                    ProficiencyModifier.fromLevelAndRank(this.level, rank),
                ];
                const notes: RollNotePF2e[] = [];
                [shortform, `int-based`, 'skill-check', 'all'].forEach((key) => {
                    (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                    (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                });

                const loreSkill: SkillData = systemData.skills[shortform];
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
                stat.roll = (args: RollParameters) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: skill.name });
                    const options = args.options ?? [];
                    ensureProficiencyOption(options, rank);
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options, dc: args.dc, notes },
                        args.event,
                        args.callback,
                    );
                };

                skills[shortform] = stat;
            });

        systemData.skills = skills as Required<typeof skills>;

        // Speeds
        {
            const label = game.i18n.localize('PF2E.SpeedTypesLand');
            const base = Number(systemData.attributes.speed.value ?? 0);
            const modifiers: ModifierPF2e[] = [];
            ['land-speed', 'speed'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });
            const stat = mergeObject(
                new StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: label }), modifiers),
                systemData.attributes.speed,
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
            systemData.attributes.speed = stat;
        }
        for (let idx = 0; idx < systemData.attributes.speed.otherSpeeds.length; idx++) {
            const speed = systemData.attributes.speed.otherSpeeds[idx];
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
            systemData.attributes.speed.otherSpeeds[idx] = stat;
        }

        // Familiar Abilities
        {
            const modifiers: ModifierPF2e[] = [];
            (statisticsModifiers['familiar-abilities'] || [])
                .map((m) => duplicate(m))
                .forEach((m) => modifiers.push(m));

            const stat = mergeObject(
                new StatisticModifier('familiar-abilities', modifiers),
                systemData.attributes.familiarAbilities,
                { overwrite: false },
            );
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            systemData.attributes.familiarAbilities = stat;
        }

        // Automatic Actions
        systemData.actions = [];

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
                .map((key) => ({ key, data: combatProficiencies[key] }))
                .reduce((accumulated: ProficienciesBrief, proficiency) => {
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
                }, {});
        };
        const weaponMap = LocalizePF2e.translations.PF2E.Weapon.Base;
        const weaponProficiencies = getProficiencies(weaponMap, systemData.martial, 'weapon-base-');
        const groupProficiencies = getProficiencies(CONFIG.PF2E.weaponGroups, systemData.martial, 'weapon-group-');

        // Add any homebrew categories
        const homebrewCategoryTags = game.settings.get('pf2e', 'homebrew.weaponCategories');
        const homebrewProficiencies = homebrewCategoryTags.reduce(
            (categories: Partial<Record<WeaponCategory, { name: string; rank: ZeroToFour }>>, category) =>
                mergeObject(categories, {
                    [category.id]: {
                        name: category.value,
                        rank: systemData.martial[category.id]?.rank ?? 0,
                    },
                }),
            {},
        );

        interface BaseProficiencyData {
            name: string;
            rank: ZeroToFour;
        }
        const proficiencies: Record<string, BaseProficiencyData> = {
            simple: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.simple),
                rank: systemData.martial.simple.rank ?? 0,
            },
            martial: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.martial),
                rank: systemData.martial.martial.rank ?? 0,
            },
            advanced: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.advanced),
                rank: systemData.martial.advanced.rank ?? 0,
            },
            unarmed: {
                name: game.i18n.localize(CONFIG.PF2E.martialSkills.unarmed),
                rank: systemData.martial.unarmed.rank ?? 0,
            },
            ...homebrewProficiencies,
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
                strikingRune: { value: null },
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

        const ammos = this.itemTypes.consumable
            .filter((item) => item.data.data.consumableType.value === 'ammo')
            .map((ammo) => ammo.data);

        const coreCategories = ['simple', 'martial', 'unarmed', 'advanced'] as const;
        const allCategories = coreCategories.concat(homebrewCategoryTags.map((tag) => tag.id));

        this.itemTypes.weapon
            .map((weapon) => weapon.data)
            .concat([unarmed as WeaponData])
            .concat(strikes)
            .forEach((item) => {
                const modifiers: ModifierPF2e[] = [];

                // Determine the base ability score for this attack.
                let ability: AbilityString;
                {
                    ability = item.data.ability?.value || 'str'; // default to Str
                    let score = systemData.abilities[ability]?.value ?? 0;
                    // naive check for finesse, which should later be changed to take conditions like
                    // enfeebled and clumsy into consideration
                    if (
                        item.data.traits.value.includes('finesse') &&
                        systemData.abilities.dex.mod > systemData.abilities[ability].mod
                    ) {
                        ability = 'dex';
                        score = systemData.abilities.dex.value;
                    }
                    modifiers.push(AbilityModifier.fromAbilityScore(ability, score));
                }

                // If the character has an ancestral weapon familiarity, it will make weapons with their ancestry
                // trait also count as a weapon of different category
                const weaponCategory = item.data.weaponType.value ?? 'simple';
                const categoryRank = systemData.martial[weaponCategory]?.rank ?? 0;
                const familiarityRank = (() => {
                    const weaponTraits = item.data.traits.value;
                    const familiarity = allCategories.find((category) => {
                        const maybeFamiliarity = systemData.martial[category]?.familiarity;
                        return (
                            maybeFamiliarity &&
                            maybeFamiliarity.category === weaponCategory &&
                            weaponTraits.includes(maybeFamiliarity.trait)
                        );
                    });
                    return familiarity ? systemData.martial[familiarity]?.rank ?? 0 : 0;
                })();

                const groupRank = proficiencies[`weapon-group-${item.data.group.value}`]?.rank ?? 0;
                const baseWeapon = item.data.baseItem ?? item.data.slug;
                const baseWeaponRank = proficiencies[`weapon-base-${baseWeapon}`]?.rank ?? 0;

                const proficiencyRank = Math.max(categoryRank, familiarityRank, groupRank, baseWeaponRank);
                modifiers.push(ProficiencyModifier.fromLevelAndRank(this.level, proficiencyRank));

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
                if (item.data.baseItem && !selectors.includes(`${item.data.baseItem}-attack`)) {
                    selectors.push(`${item.data.baseItem}-attack`);
                }

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
                ensureWeaponCategory(defaultOptions, weaponCategory);
                ensureWeaponSize(defaultOptions, item.data.size?.value, this.data.data.traits.size.value);
                const notes: RollNotePF2e[] = [];

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
                    const potency: WeaponPotencyPF2e[] = [];
                    const multipleAttackPenalties: MultipleAttackPenaltyPF2e[] = [];
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
                    action.ammo = ammos.map((ammo) => ammo.toObject(false));
                }

                action.traits = [
                    { name: 'attack', label: game.i18n.localize('PF2E.TraitAttack'), toggle: false },
                ].concat(
                    item.data.traits.value.map((trait) => {
                        const key = CONFIG.PF2E.weaponTraits[trait] ?? trait;
                        const option: StrikeTrait = {
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
                action.attack = (args: RollParameters) => {
                    const ctx = this.createAttackRollContext(args.event!, ['all', 'attack-roll']);
                    ctx.options = (args.options ?? [])
                        .concat(ctx.options)
                        .concat(action.options)
                        .concat(defaultOptions);
                    const dc = args.dc ?? ctx.dc;
                    if (dc !== undefined && action.adjustments !== undefined) {
                        dc.adjustments = action.adjustments;
                    }
                    CheckPF2e.roll(
                        new CheckModifier(`${strikeLabel}: ${action.name}`, action),
                        { actor: this, type: 'attack-roll', options: ctx.options, notes, dc },
                        args.event,
                        args.callback,
                    );
                };
                action.roll = action.attack;

                action.variants = [
                    {
                        label: `${game.i18n.localize('PF2E.RuleElement.Strike')}
                            ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
                        roll: (args: RollParameters) => {
                            const ctx = this.createAttackRollContext(args.event!, ['all', 'attack-roll']);
                            const options = (args.options ?? [])
                                .concat(ctx.options)
                                .concat(action.options)
                                .concat(defaultOptions);
                            const dc = args.dc ?? ctx.dc;
                            if (dc !== undefined && action.adjustments !== undefined) {
                                dc.adjustments = action.adjustments;
                            }
                            CheckPF2e.roll(
                                new CheckModifier(`${strikeLabel}: ${action.name}`, action),
                                { actor: this, type: 'attack-roll', options, notes, dc },
                                args.event,
                                args.callback,
                            );
                        },
                    },
                    {
                        label: `${game.i18n.localize('PF2E.MAPAbbreviationLabel')} ${multipleAttackPenalty.map2}`,
                        roll: (args: RollParameters) => {
                            const ctx = this.createAttackRollContext(args.event!, ['all', 'attack-roll']);
                            const options = (args.options ?? [])
                                .concat(ctx.options)
                                .concat(action.options)
                                .concat(defaultOptions);
                            CheckPF2e.roll(
                                new CheckModifier(`Strike: ${action.name}`, action, [
                                    new ModifierPF2e(
                                        multipleAttackPenalty.label,
                                        multipleAttackPenalty.map2,
                                        MODIFIER_TYPE.UNTYPED,
                                    ),
                                ]),
                                { actor: this, type: 'attack-roll', options, notes, dc: args.dc ?? ctx.dc },
                                args.event,
                                args.callback,
                            );
                        },
                    },
                    {
                        label: `${game.i18n.localize('PF2E.MAPAbbreviationLabel')} ${multipleAttackPenalty.map3}`,
                        roll: (args: RollParameters) => {
                            const ctx = this.createAttackRollContext(args.event!, ['all', 'attack-roll']);
                            const options = (args.options ?? [])
                                .concat(ctx.options)
                                .concat(action.options)
                                .concat(defaultOptions);
                            CheckPF2e.roll(
                                new CheckModifier(`Strike: ${action.name}`, action, [
                                    new ModifierPF2e(
                                        multipleAttackPenalty.label,
                                        multipleAttackPenalty.map3,
                                        MODIFIER_TYPE.UNTYPED,
                                    ),
                                ]),
                                { actor: this, type: 'attack-roll', options, notes, dc: args.dc ?? ctx.dc },
                                args.event,
                                args.callback,
                            );
                        },
                    },
                ];
                action.damage = (args: RollParameters) => {
                    const ctx = this.createDamageRollContext(args.event!);
                    const options = (args.options ?? [])
                        .concat(ctx.options)
                        .concat(action.options)
                        .concat(defaultOptions);
                    const damage = WeaponDamagePF2e.calculate(
                        item,
                        this.data,
                        action.traits,
                        statisticsModifiers,
                        damageDice,
                        proficiencyRank,
                        options,
                        rollNotes,
                        weaponPotency,
                        synthetics.striking,
                    );
                    DamageRollPF2e.roll(
                        damage,
                        { type: 'damage-roll', outcome: 'success', options },
                        args.event,
                        args.callback,
                    );
                };
                action.critical = (args: RollParameters) => {
                    const ctx = this.createDamageRollContext(args.event!);
                    const options = (args.options ?? [])
                        .concat(ctx.options)
                        .concat(action.options)
                        .concat(defaultOptions);
                    const damage = WeaponDamagePF2e.calculate(
                        item,
                        this.data,
                        action.traits,
                        statisticsModifiers,
                        damageDice,
                        proficiencyRank,
                        options,
                        rollNotes,
                        weaponPotency,
                        synthetics.striking,
                    );
                    DamageRollPF2e.roll(
                        damage,
                        { type: 'damage-roll', outcome: 'criticalSuccess', options },
                        args.event,
                        args.callback,
                    );
                };
                systemData.actions.push(action);
            });

        this.itemTypes.spellcastingEntry.forEach((item) => {
            const spellcastingEntry = item.data;
            const tradition = spellcastingEntry.data.tradition.value;
            const rank = spellcastingEntry.data.proficiency.value;
            const ability = spellcastingEntry.data.ability.value || 'int';
            const baseModifiers = [
                AbilityModifier.fromAbilityScore(ability, systemData.abilities[ability].value),
                ProficiencyModifier.fromLevelAndRank(this.level, rank),
            ];
            const baseNotes: RollNotePF2e[] = [];
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
                attack.roll = (args: RollParameters) => {
                    const label = game.i18n.format(`PF2E.SpellAttack.${tradition}`);
                    const ctx = this.createAttackRollContext(args.event!, ['all', 'attack-roll', 'spell-attack-roll']);
                    const options = (args.options ?? []).concat(ctx.options);
                    ensureProficiencyOption(options, rank);
                    CheckPF2e.roll(
                        new CheckModifier(label, attack, args.modifiers ?? []),
                        { actor: this, type: 'spell-attack-roll', options, notes, dc: args.dc ?? ctx.dc },
                        args.event,
                        args.callback,
                    );
                };
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

        this.prepareInitiative(this.data, statisticsModifiers, rollNotes);

        rules.forEach((rule) => {
            try {
                rule.onAfterPrepareData(this.data, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onAfterPrepareData on rule element ${rule}.`, error);
            }
        });

        // Refresh vision of controlled tokens linked to this actor in case any of the above changed its senses
        this.refreshVision();
    }

    private prepareInitiative(
        actorData: CharacterData,
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        rollNotes: Record<string, RollNotePF2e[]>,
    ) {
        const { data } = actorData;
        const initSkill = data.attributes?.initiative?.ability || 'perception';
        const modifiers: ModifierPF2e[] = [];
        const notes: RollNotePF2e[] = [];

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
        stat.roll = (args: RollParameters) => {
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
        };

        data.attributes.initiative = stat;
    }

    /** Toggle the invested state of an owned magical item */
    async toggleInvested(itemId: string): Promise<boolean> {
        const item = this.physicalItems.get(itemId);
        if (!item?.traits.has('invested')) {
            throw ErrorPF2e('Unexpected error toggling item investment');
        }

        return !!(await item.update({ 'data.invested.value': !item.isInvested }));
    }

    /** Add a proficiency in a weapon group or base weapon */
    async addCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey) {
        const currentProficiencies = this.data.data.martial;
        if (key in currentProficiencies) return;
        const newProficiency: CharacterProficiencyData = { rank: 0, value: 0, breakdown: '', custom: true };
        await this.update({ [`data.martial.${key}`]: newProficiency });
    }

    async removeCombatProficiency(key: BaseWeaponProficiencyKey | WeaponGroupProficiencyKey) {
        await this.update({ [`data.martial.-=${key}`]: null });
    }

    /** Remove any features linked to a to-be-deleted ABC item */
    override async deleteEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        ids: string[],
        context: DocumentModificationContext = {},
    ) {
        if (embeddedName === 'Item') {
            const abcItems = [this.ancestry, this.background, this.class].filter(
                (item): item is Embedded<AncestryPF2e | BackgroundPF2e | ClassPF2e> => !!item && ids.includes(item.id),
            );
            const featureIds = abcItems.flatMap((item) => item.getLinkedFeatures().map((feature) => feature.id));
            ids.push(...featureIds);
        }
        return super.deleteEmbeddedDocuments(embeddedName, ids, context) as Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh placed lights if this character's senses changed */
    protected override _onUpdate(
        changed: DeepPartial<this['data']['_source']>,
        options: DocumentModificationContext = {},
        userId: string,
    ): void {
        if (changed.data?.traits?.senses) {
            canvas.lighting.initializeSources();
            canvas.perception.schedule({ lighting: { refresh: true }, sight: { refresh: true } });
        }
        super._onUpdate(changed, options, userId);
    }
}

export interface CharacterPF2e {
    readonly data: CharacterData;
}
