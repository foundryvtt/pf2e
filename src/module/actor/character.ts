/* global game, CONFIG */
import { LoreData, MartialData, WeaponData } from '../item/dataDefinitions';
import { PF2EItem } from '../item/item';
import { getArmorBonus, getAttackBonus, getResiliencyBonus } from '../item/runes';
import {
    AbilityModifier,
    DEXTERITY,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierPredicate,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from '../modifiers';
import { PF2RuleElements } from '../rules/rules';
import { PF2WeaponDamage } from '../system/damage/weapon';
import { PF2Check, PF2DamageRoll } from '../system/rolls';
import { PF2EActor, SKILL_DICTIONARY } from './actor';
import {
    AbilityString,
    CharacterData,
    CharacterStrike,
    CharacterStrikeTrait,
    SkillData,
    RawCharacterData,
} from './actorDataDefinitions';
import { PF2RollNote } from '../notes';

export class PF2ECharacter extends PF2EActor {
    /** @override */
    data!: CharacterData;

    /** Prepare Character type specific data. */
    prepareData(): void {
        super.prepareData();

        const actorData = this.data;
        const rules = actorData.items.reduce(
            (accumulated, current) => accumulated.concat(PF2RuleElements.fromOwnedItem(current)),
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
        // Extract as separate variables for easier use in this method.
        const { damageDice, statisticsModifiers, strikes, rollNotes } = synthetics;

        // Update experience percentage from raw experience amounts.
        data.details.xp.pct = Math.min(Math.round((data.details.xp.value * 100) / data.details.xp.max), 99.5);

        // PFS Level Bump - check and DC modifiers
        if (data.pfs?.levelBump) {
            statisticsModifiers.all = (statisticsModifiers.all || []).concat(
                new PF2Modifier('PF2E.PFS.LevelBump', 1, PF2ModifierType.UNTYPED),
            );
        }

        // Calculate HP and SP
        {
            const modifiers = [new PF2Modifier('PF2E.AncestryHP', data.attributes.ancestryhp, PF2ModifierType.UNTYPED)];

            if (game.settings.get('pf2e', 'staminaVariant')) {
                const bonusSpPerLevel = data.attributes.levelbonussp * data.details.level.value;
                const halfClassHp = Math.floor(data.attributes.classhp / 2);

                data.attributes.sp.max =
                    (halfClassHp + data.abilities.con.mod) * data.details.level.value +
                    bonusSpPerLevel +
                    data.attributes.flatbonussp;

                modifiers.push(
                    new PF2Modifier('PF2E.ClassHP', halfClassHp * data.details.level.value, PF2ModifierType.UNTYPED),
                );
            } else {
                modifiers.push(
                    new PF2Modifier(
                        'PF2E.ClassHP',
                        data.attributes.classhp * data.details.level.value,
                        PF2ModifierType.UNTYPED,
                    ),
                );
                modifiers.push(
                    new PF2Modifier(
                        'PF2E.AbilityCon',
                        data.abilities.con.mod * data.details.level.value,
                        PF2ModifierType.UNTYPED,
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

            // PFS Level Bump - hit points
            if (data.pfs?.levelBump) {
                const hitPointsBump = Math.max(10, stat.totalModifier * 0.1);
                stat.push(new PF2Modifier('PF2E.PFS.LevelBump', hitPointsBump, PF2ModifierType.UNTYPED));
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
            stat.roll = (event, options = [], callback?) => {
                const label = game.i18n.format('PF2E.SavingThrowWithName', {
                    saveName: game.i18n.localize(CONFIG.PF2E.saves[saveName]),
                });
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'saving-throw', options, notes },
                    event,
                    callback,
                );
            };

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
            const modifiers = [
                WISDOM.withScore(data.abilities.wis.value),
                ProficiencyModifier.fromLevelAndRank(data.details.level.value, data.attributes.perception.rank || 0),
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
            stat.roll = (event, options = [], callback?) => {
                const label = game.i18n.localize('PF2E.PerceptionCheck');
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'perception-check', options, notes },
                    event,
                    callback,
                );
            };

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

            const stat = mergeObject(
                new PF2StatisticModifier('PF2E.ClassDCLabel', modifiers),
                data.attributes.classDC,
                { overwrite: false },
            );
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
        const shield = this.getFirstEquippedShield();
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
            stat.roll = (event, options = [], callback?) => {
                const label = game.i18n.format('PF2E.SkillCheckWithName', {
                    skillName: game.i18n.localize(CONFIG.PF2E.skills[skillName]),
                });
                PF2Check.roll(
                    new PF2CheckModifier(label, stat),
                    { actor: this, type: 'skill-check', options, notes },
                    event,
                    callback,
                );
            };

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
                const stat = mergeObject(new PF2StatisticModifier(skill.name, modifiers), loreSkill, {
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
                stat.roll = (event, options = [], callback?) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: skill.name });
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options, notes },
                        event,
                        callback,
                    );
                };

                skills[shortform] = stat;
            });

        data.skills = skills as Required<typeof skills>;

        // Speeds
        {
            const label = game.i18n.localize('PF2E.SpeedTypesLand');
            const base = Number(data.attributes.speed.value ?? 0);
            const modifiers = [];
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
            const modifiers = [];
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

        // Familiar Abilities
        {
            const modifiers = [];
            (statisticsModifiers['familiar-abilities'] || [])
                .map((m) => duplicate(m))
                .forEach((m) => modifiers.push(m));

            const stat = mergeObject(
                new PF2StatisticModifier('familiar-abilities', modifiers),
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
        {
            // collect the weapon proficiencies
            const proficiencies = {
                simple: { name: 'Simple', rank: data?.martial?.simple?.rank ?? 0 },
                martial: { name: 'Martial', rank: data?.martial?.martial?.rank ?? 0 },
                advanced: { name: 'Advanced', rank: data?.martial?.advanced?.rank ?? 0 },
                unarmed: { name: 'Unarmed', rank: data?.martial?.unarmed?.rank ?? 0 },
            };
            (actorData.items ?? [])
                .filter((item): item is MartialData => item.type === 'martial')
                .forEach((item) => {
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
                    equipped: {
                        value: true, // consider checking for free hands
                    },
                },
            };

            // powerful fist
            if ((actorData.items ?? []).some((i) => i.type === 'feat' && i.name === 'Powerful Fist')) {
                unarmed.name = 'Powerful Fist';
                unarmed.data.damage.die = 'd6';
            }

            (actorData.items ?? [])
                .filter((item): item is WeaponData => item.type === 'weapon')
                .concat([unarmed])
                .concat(strikes)
                .forEach((item) => {
                    const modifiers = [];

                    // Determine the base ability score for this attack.
                    let ability: AbilityString;
                    {
                        ability = item.data.ability?.value || 'str'; // default to Str
                        let score = data.abilities[ability]?.value ?? 0;
                        // naive check for finesse, which should later be changed to take conditions like
                        // enfeebled and clumsy into consideration
                        if (
                            (item.data.traits?.value || []).includes('finesse') &&
                            data.abilities.dex.mod > data.abilities[ability].mod
                        ) {
                            ability = 'dex';
                            score = data.abilities.dex.value;
                        }
                        modifiers.push(AbilityModifier.fromAbilityScore(ability, score));
                    }
                    modifiers.push(
                        ProficiencyModifier.fromLevelAndRank(
                            data.details.level.value,
                            proficiencies[item.data.weaponType.value]?.rank ?? 0,
                        ),
                    );

                    const attackBonus = getAttackBonus(item.data);
                    if (attackBonus !== 0) {
                        modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', attackBonus, PF2ModifierType.ITEM));
                    }

                    const defaultOptions = PF2EActor.traits(item?.data?.traits?.value); // always add all weapon traits as options
                    defaultOptions.push(`${ability}-attack`);
                    const notes = [] as PF2RollNote[];

                    // Conditions and Custom modifiers to attack rolls
                    {
                        const stats = [];
                        if (item.data?.group?.value) {
                            stats.push(`${item.data.group.value.toLowerCase()}-weapon-group-attack`);
                        }
                        stats.push(`${item.name.replace(/\s+/g, '-').toLowerCase()}-attack`); // convert white spaces to dash and lower-case all letters
                        stats
                            .concat([
                                'attack',
                                `${ability}-attack`,
                                `${ability}-based`,
                                `${item._id}-attack`,
                                'attack-roll',
                                'all',
                            ])
                            .forEach((key) => {
                                (statisticsModifiers[key] || [])
                                    .map((m) => duplicate(m))
                                    .forEach((m) => {
                                        m.ignored = !PF2ModifierPredicate.test(m.predicate, defaultOptions);
                                        modifiers.push(m);
                                    });
                                (rollNotes[key] ?? []).map((n) => duplicate(n)).forEach((n) => notes.push(n));
                            });
                    }

                    const action: Partial<CharacterStrike> = new PF2StatisticModifier(item.name, modifiers);

                    action.imageUrl = item.img;
                    action.item = item?._id;
                    action.ready = item?.data?.equipped?.value ?? false;
                    action.glyph = 'A';
                    action.type = 'strike';
                    const flavor = this.getStrikeDescription(item);
                    action.description = flavor.description;
                    action.criticalSuccess = flavor.criticalSuccess;
                    action.success = flavor.success;
                    action.options = item?.data?.options?.value ?? [];

                    action.traits = [
                        { name: 'attack', label: game.i18n.localize('PF2E.TraitAttack'), toggle: false },
                    ].concat(
                        PF2EActor.traits(item?.data?.traits?.value).map((trait) => {
                            const key = CONFIG.PF2E.weaponTraits[trait] ?? trait;
                            const option: CharacterStrikeTrait = {
                                name: trait,
                                label: game.i18n.localize(key),
                                toggle: false,
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

                    // Add the base attack roll (used for determining on-hit)
                    const strike = action as Required<typeof action>;
                    action.attack = (event, options = []) => {
                        options = options.concat(defaultOptions);
                        PF2Check.roll(
                            new PF2CheckModifier(`Strike: ${action.name}`, strike),
                            { actor: this, type: 'attack-roll', options, notes },
                            event,
                        );
                    };
                    action.roll = action.attack;

                    const map = PF2EItem.calculateMap(item);
                    action.variants = [
                        {
                            label: `Strike ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
                            roll: (event, options = []) => {
                                options = options.concat(defaultOptions);
                                PF2Check.roll(
                                    new PF2CheckModifier(`Strike: ${action.name}`, strike),
                                    { actor: this, type: 'attack-roll', options, notes },
                                    event,
                                );
                            },
                        },
                        {
                            label: `MAP ${map.map2}`,
                            roll: (event, options = []) => {
                                options = options.concat(defaultOptions);
                                PF2Check.roll(
                                    new PF2CheckModifier(`Strike: ${action.name}`, strike, [
                                        new PF2Modifier(
                                            'PF2E.MultipleAttackPenalty',
                                            map.map2,
                                            PF2ModifierType.UNTYPED,
                                        ),
                                    ]),
                                    { actor: this, type: 'attack-roll', options, notes },
                                    event,
                                );
                            },
                        },
                        {
                            label: `MAP ${map.map3}`,
                            roll: (event, options = []) => {
                                options = options.concat(defaultOptions);
                                PF2Check.roll(
                                    new PF2CheckModifier(`Strike: ${action.name}`, strike, [
                                        new PF2Modifier(
                                            'PF2E.MultipleAttackPenalty',
                                            map.map3,
                                            PF2ModifierType.UNTYPED,
                                        ),
                                    ]),
                                    { actor: this, type: 'attack-roll', options, notes },
                                    event,
                                );
                            },
                        },
                    ];
                    action.damage = (event, options = [], callback?) => {
                        options = options.concat(strike.options);
                        const damage = PF2WeaponDamage.calculate(
                            item,
                            actorData,
                            action.traits,
                            statisticsModifiers,
                            damageDice,
                            proficiencies[item.data.weaponType.value]?.rank ?? 0,
                            options,
                            rollNotes,
                        );
                        PF2DamageRoll.roll(
                            damage,
                            { type: 'damage-roll', outcome: 'success', options },
                            event,
                            callback,
                        );
                    };
                    action.critical = (event, options = [], callback?) => {
                        options = options.concat(strike.options);
                        const damage = PF2WeaponDamage.calculate(
                            item,
                            actorData,
                            action.traits,
                            statisticsModifiers,
                            damageDice,
                            proficiencies[item.data.weaponType.value]?.rank ?? 0,
                            options,
                            rollNotes,
                        );
                        PF2DamageRoll.roll(
                            damage,
                            { type: 'damage-roll', outcome: 'criticalSuccess', options },
                            event,
                            callback,
                        );
                    };
                    data.actions.push(strike);
                });
        }

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
}
