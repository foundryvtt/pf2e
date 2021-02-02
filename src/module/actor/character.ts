import { AncestryData, BackgroundData, ClassData, LoreData, MartialData, WeaponData } from '@item/dataDefinitions';
import { PF2EItem } from '@item/item';
import { getArmorBonus, getResiliencyBonus } from '@item/runes';
import {
    AbilityModifier,
    DEXTERITY,
    ensureProficiencyOption,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierPredicate,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
    WISDOM,
} from '../modifiers';
import { PF2RuleElement, PF2RuleElements } from '../rules/rules';
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
import { PF2MultipleAttackPenalty, PF2WeaponPotency } from '../rules/rulesDataDefinitions';
import { toNumber } from '../utils';
import { adaptRoll } from '../system/rolls';

export class PF2ECharacter extends PF2EActor {
    data!: CharacterData;

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const actorData = this.data;

        this.prepareAncestry(actorData);
        this.prepareBackground(actorData);
        this.prepareClass(actorData);

        const rules: PF2RuleElement[] = actorData.items.reduce(
            (accumulated: PF2RuleElement[], current) => accumulated.concat(PF2RuleElements.fromOwnedItem(current)),
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
                stat.roll = adaptRoll((args) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', { skillName: skill.name });
                    const options = args.options ?? [];
                    ensureProficiencyOption(options, rank);
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
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

        // Familiar Abilities
        {
            const modifiers: PF2Modifier[] = [];
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
                    const modifiers: PF2Modifier[] = [];

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

                    let proficiencyRank = proficiencies[item.data.weaponType.value]?.rank ?? 0;
                    modifiers.push(ProficiencyModifier.fromLevelAndRank(data.details.level.value, proficiencyRank));

                    const selectors = [
                        'attack',
                        `${ability}-attack`,
                        `${ability}-based`,
                        `${item._id}-attack`,
                        `${item.name.slugify('-', true)}-attack`,
                        'attack-roll',
                        'all',
                    ];
                    if (item.data?.group?.value) {
                        selectors.push(`${item.data.group.value.toLowerCase()}-weapon-group-attack`);
                    }

                    const defaultOptions = this.getRollOptions(['all', 'attack-roll'])
                        .concat(...PF2EActor.traits(item?.data?.traits?.value)) // always add weapon traits as options
                        .concat(`${ability}-attack`);
                    ensureProficiencyOption(defaultOptions, proficiencyRank);
                    const notes = [] as PF2RollNote[];

                    if (item.data.group?.value === 'bomb') {
                        const attackBonus = toNumber(item.data?.bonus?.value) ?? 0;
                        if (attackBonus !== 0) {
                            modifiers.push(new PF2Modifier('PF2E.ItemBonusLabel', attackBonus, PF2ModifierType.ITEM));
                        }
                    }

                    // Conditions and Custom modifiers to attack rolls
                    let weaponPotency;
                    const multipleAttackPenalty = PF2EItem.calculateMap(item);
                    {
                        const potency: PF2WeaponPotency[] = [];
                        const multipleAttackPenalties: PF2MultipleAttackPenalty[] = [];
                        selectors.forEach((key) => {
                            (statisticsModifiers[key] ?? [])
                                .map((m) => duplicate(m))
                                .forEach((m) => {
                                    m.ignored = !PF2ModifierPredicate.test(m.predicate, defaultOptions);
                                    modifiers.push(m);
                                });
                            (synthetics.weaponPotency[key] ?? [])
                                .filter((wp) => PF2ModifierPredicate.test(wp.predicate, defaultOptions))
                                .forEach((wp) => potency.push(wp));
                            (synthetics.multipleAttackPenalties[key] ?? [])
                                .filter((map) => PF2ModifierPredicate.test(map.predicate, defaultOptions))
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
                            modifiers.push(
                                new PF2Modifier(weaponPotency.label, weaponPotency.bonus, PF2ModifierType.ITEM),
                            );
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
                    action.attack = adaptRoll((args) => {
                        const options = (args.options ?? []).concat(defaultOptions);
                        PF2Check.roll(
                            new PF2CheckModifier(`Strike: ${action.name}`, strike),
                            { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                            args.event,
                            args.callback,
                        );
                    });
                    action.roll = action.attack;

                    action.variants = [
                        {
                            label: `Strike ${action.totalModifier < 0 ? '' : '+'}${action.totalModifier}`,
                            roll: adaptRoll((args) => {
                                const options = (args.options ?? []).concat(defaultOptions);
                                PF2Check.roll(
                                    new PF2CheckModifier(`Strike: ${action.name}`, strike),
                                    { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                                    args.event,
                                    args.callback,
                                );
                            }),
                        },
                        {
                            label: `MAP ${multipleAttackPenalty.map2}`,
                            roll: adaptRoll((args) => {
                                const options = (args.options ?? []).concat(defaultOptions);
                                PF2Check.roll(
                                    new PF2CheckModifier(`Strike: ${action.name}`, strike, [
                                        new PF2Modifier(
                                            multipleAttackPenalty.label,
                                            multipleAttackPenalty.map2,
                                            PF2ModifierType.UNTYPED,
                                        ),
                                    ]),
                                    { actor: this, type: 'attack-roll', options, notes, dc: args.dc },
                                    args.event,
                                    args.callback,
                                );
                            }),
                        },
                        {
                            label: `MAP ${multipleAttackPenalty.map3}`,
                            roll: adaptRoll((args) => {
                                const options = (args.options ?? []).concat(defaultOptions);
                                PF2Check.roll(
                                    new PF2CheckModifier(`Strike: ${action.name}`, strike, [
                                        new PF2Modifier(
                                            multipleAttackPenalty.label,
                                            multipleAttackPenalty.map3,
                                            PF2ModifierType.UNTYPED,
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
                        const options = (args.options ?? []).concat(strike.options);
                        const damage = PF2WeaponDamage.calculate(
                            item,
                            actorData,
                            action.traits,
                            statisticsModifiers,
                            damageDice,
                            proficiencies[item.data.weaponType.value]?.rank ?? 0,
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
                        const options = (args.options ?? []).concat(strike.options);
                        const damage = PF2WeaponDamage.calculate(
                            item,
                            actorData,
                            action.traits,
                            statisticsModifiers,
                            damageDice,
                            proficiencies[item.data.weaponType.value]?.rank ?? 0,
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

    prepareAncestry(actorData: CharacterData) {
        const ancestry: AncestryData = actorData.items.find((x): x is AncestryData => x.type === 'ancestry');

        if (ancestry) {
            actorData.data.details.ancestry.value = ancestry.name;
            actorData.data.attributes.ancestryhp = ancestry.data.hp;
            actorData.data.attributes.speed.value = `${ancestry.data.speed}`;
            actorData.data.traits.size.value = ancestry.data.size;
            // should we update the traits as well?
        }
    }

    prepareBackground(actorData: CharacterData) {
        const background: BackgroundData = actorData.items.find((x): x is BackgroundData => x.type === 'background');

        if (background) {
            actorData.data.details.background.value = background.name;
        }
    }

    prepareClass(actorData: CharacterData) {
        const classData = actorData.items.find((x): x is ClassData => x.type === 'class');

        if (classData) {
            actorData.data.details.class.value = classData.name;
            actorData.data.attributes.classhp = classData.data.hp;
        }
    }
}
