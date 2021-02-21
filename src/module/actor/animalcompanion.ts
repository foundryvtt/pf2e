import { AnimalCompanionAncestryData } from '@item/data-definitions';
import { getArmorBonus, getResiliencyBonus } from '@item/runes';
import { PF2ECharacter } from './character';
import { PF2ENPC } from './npc';
import {
    AbilityModifier,
    DEXTERITY,
    ensureProficiencyOption,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from '../modifiers';
import { PF2RuleElement, PF2RuleElements } from '../rules/rules';
import { PF2Check } from '../system/rolls';
import { PF2EActor, SKILL_DICTIONARY } from './actor';
import { RawCharacterData, AnimalCompanionData, DexterityModifierCapData } from './actor-data-definitions';
import { PF2RollNote } from '../notes';
import { adaptRoll } from '../system/rolls';

export class PF2EAnimalCompanion extends PF2EActor {
    data!: AnimalCompanionData;

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const actorData = this.data;
        const { data } = actorData;

        const gameActors = game.actors instanceof Actors ? game.actors : new Map();
        const master = gameActors.get(data.master.id);

        this.prepareAncestry(actorData);

        const rules: PF2RuleElement[] = actorData.items.reduce(
            (accumulated: PF2RuleElement[], current) => accumulated.concat(PF2RuleElements.fromOwnedItem(current)),
            [],
        );

        // Compute 'fake' ability scores from ability modifiers (just in case the scores are required for something)
        for (const abl of Object.values(actorData.data.abilities)) {
            abl.mod = Number(abl.mod ?? 0); // ensure the modifier is never a string
            abl.value = abl.mod * 2 + 10;
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
        // Extract as separate variables for easier use in this method.
        const { statisticsModifiers, rollNotes } = synthetics;

        if (master instanceof PF2ECharacter || master instanceof PF2ENPC) {
            data.master.level = master.data.data.details.level ?? void 0;
            data.master.name = master.name;
            //to make logic from character work seemlessly(ish)
            data.details.level = data.master.level;
        }

        // Calculate HP and SP
        {
            const ancestryHP = data.attributes.ancestryhp ?? 0;
            const classHP = data.attributes.classhp ?? 0;
            const modifiers = [new PF2Modifier('PF2E.AncestryHP', ancestryHP, PF2ModifierType.UNTYPED)];

            if (game.settings.get('pf2e', 'staminaVariant')) {
                const bonusSpPerLevel = data.attributes.levelbonussp ?? 0 * data.details.level.value;
                const halfClassHp = Math.floor(classHP / 2);

                data.attributes.sp.max =
                    (halfClassHp + data.abilities.con.mod) * data.details.level.value +
                    bonusSpPerLevel +
                    data.attributes.flatbonussp;

                modifiers.push(
                    new PF2Modifier('PF2E.ClassHP', halfClassHp * data.details.level.value, PF2ModifierType.UNTYPED),
                );
            } else {
                modifiers.push(
                    new PF2Modifier('PF2E.ClassHP', classHP * data.details.level.value, PF2ModifierType.UNTYPED),
                );
                modifiers.push(
                    new PF2Modifier(
                        'PF2E.AbilityCon',
                        data.abilities.con.mod * data.details.level.value,
                        PF2ModifierType.ABILITY,
                    ),
                );
            }

            if (data.attributes.flatbonushp) {
                modifiers.push(
                    new PF2Modifier('PF2E.FlatBonusHP', data.attributes.flatbonushp, PF2ModifierType.UNTYPED),
                );
            }
            if (data.attributes.levelbonushp) {
                modifiers.push(
                    new PF2Modifier(
                        'PF2E.BonusHPperLevel',
                        data.attributes.levelbonushp * data.details.level.value,
                        PF2ModifierType.UNTYPED,
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

            const stat = mergeObject(new PF2StatisticModifier('hp', modifiers), data.attributes.hp, {
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

        // Saves
        const worn = this.getFirstWornArmor();
        for (const [saveName, save] of Object.entries(data.saves)) {
            // Base modifiers from ability scores & level/proficiency rank.
            const modifiers = [
                AbilityModifier.fromAbilityScore(save.ability, data.abilities[save.ability].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, save.rank),
            ];
            const notes = [] as PF2RollNote[];

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

            // Add custom modifiers and roll notes relevant to this save.
            [saveName, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            // Create a new modifier from the modifiers, then merge in other fields from the old save data, and finally
            // overwrite potentially changed fields.
            const stat = mergeObject(new PF2StatisticModifier(saveName, modifiers), save, { overwrite: false });
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.roll = adaptRoll((args) => {
                const label = game.i18n.format('PF2E.SavingThrowWithName', {
                    saveName: game.i18n.localize(CONFIG.PF2E.saves[saveName]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, save.rank);
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
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
            const notes = [] as PF2RollNote[];
            if (data.attributes.perception.item) {
                modifiers.push(
                    new PF2Modifier(
                        'PF2E.ItemBonusLabel',
                        Number(data.attributes.perception.item),
                        PF2ModifierType.ITEM,
                    ),
                );
            }
            ['perception', 'wis-based', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            const stat = mergeObject(new PF2StatisticModifier('perception', modifiers), data.attributes.perception, {
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
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'perception-check', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            });

            data.attributes.perception = stat;
        }

        // Armor Class
        {
            const modifiers: PF2Modifier[] = [];
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

            const stat = mergeObject(new PF2StatisticModifier('ac', modifiers), data.attributes.ac, {
                overwrite: false,
            });
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

        // Skill modifiers

        const skills: Partial<RawCharacterData['skills']> = {}; // rebuild the skills object to clear out any deleted or renamed skills from previous iterations

        for (const [skillName, skill] of Object.entries(data.skills).filter(([shortform, _]) =>
            Object.keys(SKILL_DICTIONARY).includes(shortform),
        )) {
            const modifiers = [
                AbilityModifier.fromAbilityScore(skill.ability, data.abilities[skill.ability].value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, skill.rank),
            ];
            const notes = [] as PF2RollNote[];
            if (skill.item) {
                modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', skill.item, PF2ModifierType.ITEM));
            }
            if (skill.armor && data.attributes.ac.check && data.attributes.ac.check < 0) {
                modifiers.push(
                    new PF2Modifier('PF2E.ArmorCheckPenalty', data.attributes.ac.check, PF2ModifierType.UNTYPED),
                );
            }

            // workaround for the shortform skill names
            const expandedName = SKILL_DICTIONARY[skillName];

            [expandedName, `${skill.ability}-based`, 'skill-check', 'all'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
            });

            // preserve backwards-compatibility
            const stat = mergeObject(new PF2StatisticModifier(expandedName, modifiers), skill, { overwrite: false });
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                .join(', ');
            stat.value = stat.totalModifier;
            stat.notes = notes;
            stat.roll = adaptRoll((args) => {
                const label = game.i18n.format('PF2E.SkillCheckWithName', {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[skillName]),
                });
                const options = args.options ?? [];
                ensureProficiencyOption(options, skill.rank);
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'skill-check', options, dc: args.dc, notes },
                    args.event,
                    args.callback,
                );
            });

            skills[skillName] = stat;
        }

        data.skills = skills as Required<typeof skills>;

        // Speeds
        {
            const label = game.i18n.localize('PF2E.SpeedTypesLand');
            const base = Number(data.attributes.speed.value ?? 0);
            const modifiers: PF2Modifier[] = [];
            ['land-speed', 'speed'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });
            const stat = mergeObject(
                new PF2StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: label }), modifiers),
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
            const modifiers: PF2Modifier[] = [];
            [`${speed.type}-speed`, 'speed'].forEach((key) => {
                (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => modifiers.push(m));
            });
            const stat = mergeObject(
                new PF2StatisticModifier(game.i18n.format('PF2E.SpeedLabel', { type: speed.label }), modifiers),
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
    }

    prepareAncestry(actorData: AnimalCompanionData) {
        const ancestry: AnimalCompanionAncestryData | undefined = actorData.items.find(
            (x): x is AnimalCompanionAncestryData => x.type === 'ac_ancestry',
        );

        if (ancestry) {
            actorData.data.details.ancestry.value = ancestry.name;
            actorData.data.attributes.ancestryhp = ancestry.data.hp;
            actorData.data.attributes.classhp = ancestry.data.hpperlevel; //to reuse existing code for now
            actorData.data.attributes.speed.value = `${ancestry.data.speed}`;
            actorData.data.traits.size.value = ancestry.data.size;

            actorData.data.abilities.str.mod = ancestry.data.abilities.strmod;
            actorData.data.abilities.dex.mod = ancestry.data.abilities.dexmod;
            actorData.data.abilities.con.mod = ancestry.data.abilities.conmod;
            actorData.data.abilities.int.mod = ancestry.data.abilities.intmod;
            actorData.data.abilities.wis.mod = ancestry.data.abilities.wismod;
            actorData.data.abilities.cha.mod = ancestry.data.abilities.chamod;

            // should we update the traits as well?
        } else {
            actorData.data.details.ancestry.value = 'default';
            actorData.data.attributes.ancestryhp = 10;
            actorData.data.attributes.classhp = 6;

            actorData.data.abilities.str.mod = 2;
            actorData.data.abilities.dex.mod = 2;
            actorData.data.abilities.con.mod = 1;
            actorData.data.abilities.int.mod = -4;
            actorData.data.abilities.wis.mod = 1;
            actorData.data.abilities.cha.mod = 1;

            actorData.data.attributes.speed.value = '25';
            actorData.data.traits.size.value = 'sm';
        }
    }
}
