/* global game, CONFIG */
import { PF2EActor, SKILL_DICTIONARY, SKILL_EXPANDED } from './actor';
import { PF2ECharacter } from './character';
import { PF2ENPC } from './npc';
import { PF2CheckModifier, PF2Modifier, PF2ModifierType, PF2StatisticModifier } from '../modifiers';
import { PF2Check } from '../system/rolls';
import { FamiliarData } from './actorDataDefinitions';
import { PF2RuleElements } from '../rules/rules';

export class PF2EFamiliar extends PF2EActor {
    /** @override */
    data!: FamiliarData;

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const data = this.data.data;
        const rules = this.data.items.reduce(
            (accumulated, current) => accumulated.concat(PF2RuleElements.fromOwnedItem(current)),
            [],
        );

        // traits
        data.traits.traits.value = ['minion'];

        // traits
        data.traits.traits.value = [CONFIG.PF2E.monsterTraits.minion];

        const gameActors = game.actors instanceof Actors ? game.actors : new Map();
        const master = gameActors.get(data.master?.id);

        if (master instanceof PF2ECharacter || master instanceof PF2ENPC) {
            data.master.name = master.name;
            data.master.level = master.data.data.details.level.value ?? 0;
            data.master.ability = data.master.ability ?? 'cha';
            data.master.familiarAbilities = {
                breakdown: master.data.data.attributes.familiarAbilities?.breakdown ?? '',
                value: master.data.data.attributes.familiarAbilities?.value ?? 0,
            };
            data.details.level.value = data.master.level;
            const spellcastingAbilityModifier = master.data.data.abilities[data.master.ability].mod;

            // base size
            data.traits.size.value = 'tiny';
            data.traits.size.label = CONFIG.PF2E.actorSizes[data.traits.size.value];

            // base senses
            data.traits.senses = [{ type: 'lowLightVision', label: 'PF2E.SensesLowLightVision' }];

            const { statisticsModifiers } = this._prepareCustomModifiers(this.data, rules);
            const FILTER_MODIFIER = (modifier: PF2Modifier) =>
                ![PF2ModifierType.ABILITY, PF2ModifierType.PROFICIENCY, PF2ModifierType.ITEM].includes(modifier.type);

            if (Object.keys(data.attributes.speed.otherSpeeds).length === 0) {
                data.attributes.speed.otherSpeeds.push({
                    label: 'Land',
                    type: 'land',
                    value: 25,
                });
            }
            for (let idx = 0; idx < data.attributes.speed.otherSpeeds.length; idx++) {
                const speed = data.attributes.speed.otherSpeeds[idx];
                const base = Number(speed.value ?? 0);
                const modifiers = [];
                [`${speed.type}-speed`, 'speed'].forEach((key) => {
                    (statisticsModifiers[key as string] || [])
                        .filter(FILTER_MODIFIER)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m));
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

            // hit points
            {
                const modifiers = [
                    new PF2Modifier('PF2E.MasterLevelHP', data.master.level * 5, PF2ModifierType.UNTYPED),
                ];
                (statisticsModifiers.hp || [])
                    .filter(FILTER_MODIFIER)
                    .map((m) => duplicate(m))
                    .forEach((m) => modifiers.push(m));
                (statisticsModifiers['hp-per-level'] || [])
                    .filter(FILTER_MODIFIER)
                    .map((m) => duplicate(m))
                    .forEach((m) => {
                        m.modifier *= data.details.level.value;
                        modifiers.push(m);
                    });

                const stat = mergeObject(new PF2StatisticModifier('hp', modifiers), data.attributes.hp, {
                    overwrite: false,
                });
                stat.max = stat.totalModifier;
                stat.value = Math.min(stat.value, stat.max);
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                data.attributes.hp = stat;
            }

            // armor class
            {
                const source = master.data.data.attributes.ac.modifiers.filter(
                    (modifier) => !['status', 'circumstance'].includes(modifier.type),
                );
                const base = 10 + new PF2StatisticModifier('base', source).totalModifier;
                const modifiers = [];
                ['ac', 'dex-based', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(FILTER_MODIFIER)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = mergeObject(new PF2StatisticModifier('ac', modifiers), data.attributes.ac, {
                    overwrite: false,
                });
                stat.value = base + stat.totalModifier;
                stat.breakdown = [game.i18n.format('PF2E.MasterArmorClass', { base })]
                    .concat(
                        stat.modifiers
                            .filter((m) => m.enabled)
                            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`),
                    )
                    .join(', ');
                data.attributes.ac = stat;
            }

            // saving throws
            for (const [saveName, save] of Object.entries(master.data.data.saves)) {
                const source = save.modifiers.filter((modifier) => !['status', 'circumstance'].includes(modifier.type));
                const modifiers = [
                    new PF2Modifier(
                        `PF2E.MasterSavingThrow.${saveName}`,
                        new PF2StatisticModifier('base', source).totalModifier,
                        PF2ModifierType.UNTYPED,
                    ),
                ];
                [save.name, `${save.ability}-based`, 'saving-throw', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(FILTER_MODIFIER)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = new PF2StatisticModifier(CONFIG.PF2E.saves[saveName], modifiers);
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event: JQuery.TriggeredEvent, options = [], callback?: (roll: Roll) => void) => {
                    const label = game.i18n.format('PF2E.SavingThrowWithName', {
                        saveName: game.i18n.localize(CONFIG.PF2E.saves[save.name]),
                    });
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
                        { actor: this, type: 'saving-throw', options },
                        event,
                        callback,
                    );
                };
                data.saves[saveName] = stat;
            }

            // attack
            {
                const modifiers = [
                    new PF2Modifier('PF2E.MasterLevel', data.details.level.value, PF2ModifierType.UNTYPED),
                ];
                ['attack', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(FILTER_MODIFIER)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = new PF2StatisticModifier('attack', modifiers);
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event: JQuery.TriggeredEvent, options = [], callback?: (roll: Roll) => void) => {
                    PF2Check.roll(
                        new PF2CheckModifier('Attack Roll', stat),
                        { actor: this, type: 'attack-roll', options },
                        event,
                        callback,
                    );
                };
                data.attack = stat;
            }

            // perception
            {
                const modifiers = [
                    new PF2Modifier('PF2E.MasterLevel', data.details.level.value, PF2ModifierType.UNTYPED),
                    new PF2Modifier(
                        `PF2E.MasterAbility.${data.master.ability}`,
                        spellcastingAbilityModifier,
                        PF2ModifierType.UNTYPED,
                    ),
                ];
                ['perception', 'wis-based', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(FILTER_MODIFIER)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = mergeObject(
                    new PF2StatisticModifier('perception', modifiers),
                    data.attributes.perception,
                    { overwrite: false },
                );
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event: JQuery.TriggeredEvent, options = [], callback?: (roll: Roll) => void) => {
                    const label = game.i18n.localize('PF2E.PerceptionCheck');
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
                        { actor: this, type: 'perception-check', options },
                        event,
                        callback,
                    );
                };
                data.attributes.perception = stat;
            }

            // skills
            for (const [shortform, skillName] of Object.entries(CONFIG.PF2E.skills)) {
                const modifiers = [
                    new PF2Modifier('PF2E.MasterLevel', data.details.level.value, PF2ModifierType.UNTYPED),
                ];
                if (['acr', 'ste'].includes(shortform)) {
                    modifiers.push(
                        new PF2Modifier(
                            `PF2E.MasterAbility.${data.master.ability}`,
                            spellcastingAbilityModifier,
                            PF2ModifierType.UNTYPED,
                        ),
                    );
                }
                const expanded = SKILL_DICTIONARY[shortform];
                const ability = SKILL_EXPANDED[expanded].ability;
                [expanded, `${ability}-based`, 'skill-check', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(FILTER_MODIFIER)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = new PF2StatisticModifier(game.i18n.localize(`PF2E.Skill${skillName}`), modifiers);
                stat.value = stat.totalModifier;
                stat.ability = ability;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event: JQuery.TriggeredEvent, options = [], callback?: (roll: Roll) => void) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', {
                        skillName: game.i18n.localize(CONFIG.PF2E.skills[shortform]),
                    });
                    PF2Check.roll(
                        new PF2CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options },
                        event,
                        callback,
                    );
                };
                data.skills[shortform] = stat;
            }
        } else {
            data.master.name = undefined;
            data.master.level = 0;
            data.master.familiarAbilities = {
                breakdown: '',
                value: 0,
            };
            data.details.level.value = 0;
            data.attributes.hp = {
                value: data.attributes.hp.value,
                max: data.attributes.hp.value,
            };
            data.attributes.ac = {
                value: 10,
                breakdown: game.i18n.localize('PF2E.ArmorClassBase'),
            };
            data.saves = {
                fortitude: { value: 0 },
                reflex: { value: 0 },
                will: { value: 0 },
            };
            data.attributes.perception = {
                value: 0,
            };
        }
    }
}
