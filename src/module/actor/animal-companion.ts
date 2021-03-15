import { CharacterPF2e } from './character';
import { NPCPF2e } from './npc';
import { PF2RollNote } from '../notes';
import {
    AbilityString,
    RawAnimalCompanionData,
    AnimalCompanionData,
    SkillAbbreviation,
    DexterityModifierCapData,
    SaveString,
    SkillData,
} from './data-definitions';
import { SKILL_DICTIONARY } from './base';
import { CreaturePF2e } from './creature';
import {
    ModifierPF2e,
    ModifierType,
    StatisticModifier,
    AbilityModifier,
    ProficiencyModifier,
    ensureProficiencyOption,
    CheckModifier,
    WISDOM,
    DEXTERITY,
} from '../modifiers';
import { adaptRoll, CheckPF2e } from '@system/rolls';
import { objectHasKey } from '@module/utils';

export class AnimalCompanionPF2e extends CreaturePF2e {
    /** @override */
    static readonly type = 'animalCompanion';

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const actorData = this.data;
        const { data } = actorData;
        this.getDataFromMaster(data);

        this.calculateProficiencies(data);
        this.calculateAbilityScores(data);
        this.calculateHP(data);

        this.calculateSaves(data);
        this.calculatePerception(data);
        this.calculateArmorClass(data);

        this.calculateSkillModifiers(data);
        this.calculateMartialModifiers(data);
    }

    private getDataFromMaster(data: RawAnimalCompanionData): void {
        const gameActors = game.actors instanceof Actors ? game.actors : new Map();
        const master = gameActors.get(data.master.id);

        if (master instanceof CharacterPF2e || master instanceof NPCPF2e) {
            data.master.name = master.name;
            data.master.level = master.data.data.details.level;
            data.details.level = data.master.level;
        } else {
            //No master, but we still need valid values
            data.master.level = { value: 1, min: 1 };
            data.details.level = data.master.level;
        }
    }

    private calculateAbilityScores(data: RawAnimalCompanionData): void {
        //Get ability values from ancestry and modify with mature, savage, nimble, etc.
        for (const [abilityName, abilityData] of Object.entries(data.attributes.ancestry.abilities)) {
            abilityData.mod = Number(abilityData.mod ?? 0); // ensure the modifier is never a string
            abilityData.value = abilityData.mod * 2 + 10;
            data.abilities[abilityName as AbilityString] = abilityData;
        }
    }

    private calculateHP(data: RawAnimalCompanionData): void {
        const ancestryHP = data.attributes.ancestry.ancestryHP ?? 0;
        const ancestryHPperLevel = data.attributes.ancestry.ancestryHPPerLevel ?? 0;
        const modifiers = [new ModifierPF2e('PF2E.AnimalCompanion.AncestryHP', ancestryHP, ModifierType.UNTYPED)];

        modifiers.push(
            new ModifierPF2e(
                'PF2E.AnimalCompanion.HPPerLevel',
                ancestryHPperLevel * data.details.level.value,
                ModifierType.UNTYPED,
            ),
        );

        modifiers.push(
            new ModifierPF2e(
                'PF2E.AbilityCon',
                data.abilities.con.mod * data.details.level.value,
                ModifierType.ABILITY,
            ),
        );

        if (data.attributes.flatbonushp) {
            modifiers.push(new ModifierPF2e('PF2E.FlatBonusHP', data.attributes.flatbonushp, ModifierType.UNTYPED));
        }
        if (data.attributes.levelbonushp) {
            modifiers.push(
                new ModifierPF2e(
                    'PF2E.BonusHPperLevel',
                    data.attributes.levelbonushp * data.details.level.value,
                    ModifierType.UNTYPED,
                ),
            );
        }

        const stat = mergeObject(new StatisticModifier('hp', modifiers), data.attributes.hp, {
            overwrite: false,
        });

        stat.max = stat.totalModifier;
        stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
        stat.breakdown = stat.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
            .join(', ');

        data.attributes.hp = stat;
    }

    private calculateSaves(data: RawAnimalCompanionData): void {
        for (const [saveName, save] of Object.entries(data.saves)) {
            // Base modifiers from ability scores & level/proficiency rank.
            const modifiers = [
                AbilityModifier.fromAbilityScore(save.ability, data.abilities[save.ability as AbilityString].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, save.rank),
            ];
            const notes = [] as PF2RollNote[];

            if (save.item) {
                modifiers.push(new ModifierPF2e('PF2E.ItemBonusLabel', Number(save.item), ModifierType.ITEM));
            }

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
                    saveName: objectHasKey(CONFIG.PF2E.saves, saveName)
                        ? game.i18n.localize(CONFIG.PF2E.saves[saveName])
                        : saveName,
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

            data.saves[saveName as SaveString] = stat;
        }
    }

    private calculateProficiencies(data: RawAnimalCompanionData): void {
        //animal companion is trained in all saving throws
        data.saves.fortitude.rank = 1;
        data.saves.reflex.rank = 1;
        data.saves.will.rank = 1;
        //also perception
        data.attributes.perception.rank = 1;
        //acrobatics and atheletics...
        data.skills.acr.rank = 1;
        data.skills.ath.rank = 1;
        //unarmored attack and defence
        data.martial.unarmed.rank = 1;
        data.martial.unarmored.rank = 1;
        //barding, no skill for barding yet.
        //trained in one ancestry skill
        if (Object.keys(SKILL_DICTIONARY).includes(data.attributes.ancestry.skill)) {
            data.skills[data.attributes.ancestry.skill].rank = 1;
        }
        //here will also be skill increases from mature companion and other progression, preferably through rule elements later
    }

    private calculateMartialModifiers(data: RawAnimalCompanionData): void {
        for (const skl of Object.values(data.martial)) {
            const proficiency = ProficiencyModifier.fromLevelAndRank(data.details.level.value, skl.rank || 0);
            skl.value = proficiency.modifier;
            skl.breakdown = `${game.i18n.localize(proficiency.name)} ${proficiency.modifier < 0 ? '' : '+'}${
                proficiency.modifier
            }`;
        }
    }

    private calculatePerception(data: RawAnimalCompanionData): void {
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
                new ModifierPF2e('PF2E.ItemBonusLabel', Number(data.attributes.perception.item), ModifierType.ITEM),
            );
        }

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

    private calculateSkillModifiers(data: RawAnimalCompanionData): void {
        // Skill modifiers

        for (const [skillName, skill] of Object.entries(data.skills).filter(([shortform, _]) =>
            Object.keys(SKILL_DICTIONARY).includes(shortform),
        )) {
            const modifiers = [
                AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability as AbilityString].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
            ];
            const notes = [] as PF2RollNote[];

            if (skill.item) {
                modifiers.push(new ModifierPF2e('PF2E.ItemBonusLabel', skill.item, ModifierType.ITEM));
            }

            // workaround for the shortform skill names
            const expandedName = SKILL_DICTIONARY[skillName as SkillAbbreviation];

            const stat = mergeObject(new StatisticModifier(expandedName, modifiers), skill as SkillData, {
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
                    skillName: objectHasKey(CONFIG.PF2E.skills, skillName)
                        ? game.i18n.localize(CONFIG.PF2E.skills[skillName])
                        : skillName,
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
            data.skills[skillName as SkillAbbreviation] = stat;
        }
    }

    private calculateArmorClass(data: RawAnimalCompanionData): void {
        const modifiers: ModifierPF2e[] = [];
        const dexCap = duplicate(data.attributes.dexCap ?? []);
        const armorCheckPenalty = 0;
        const proficiency = 'unarmored';
        //no barding support yet

        // proficiency
        modifiers.unshift(
            ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.martial[proficiency]?.rank ?? 0),
        );

        // barding does have a dex cap so, accounting for it makes sense
        const dexterity = DEXTERITY.withScore(data.abilities.dex.value);
        dexterity.modifier = Math.min(dexterity.modifier, ...dexCap.map((cap) => cap.value));
        modifiers.unshift(dexterity);

        const stat = mergeObject(new StatisticModifier('ac', modifiers), data.attributes.ac, {
            overwrite: false,
        });
        //TODO: cap item bonus by 3

        stat.value = 10 + stat.totalModifier;
        stat.check = armorCheckPenalty;
        stat.dexCap = dexCap.reduce<DexterityModifierCapData | undefined>((result, current) => {
            if (result) {
                return result.value > current.value ? current : result;
            }
            return current;
        }, void 0);
        stat.breakdown = [game.i18n.localize('PF2E.ArmorClassBase')]
            .concat(
                stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
            )
            .join(', ');

        data.attributes.ac = stat;
    }
}

export interface AnimalCompanionPF2e {
    data: AnimalCompanionData;
    _data: AnimalCompanionData;
}
