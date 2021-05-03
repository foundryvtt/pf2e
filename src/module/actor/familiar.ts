import { SKILL_DICTIONARY, SKILL_EXPANDED } from './base';
import { CharacterPF2e } from './character';
import { NPCPF2e } from './npc';
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from '../modifiers';
import { CheckPF2e } from '@system/rolls';
import { AbilityString, FamiliarData, SkillAbbreviation } from './data-definitions';
import { RuleElementPF2e, RuleElements } from '../rules/rules';
import { adaptRoll } from '@system/rolls';
import { CreaturePF2e } from './creature';
import { ItemDataPF2e } from '@item/data/types';
import { objectHasKey } from '@module/utils';

export class FamiliarPF2e extends CreaturePF2e {
    /** The familiar's master, if selected */
    get master(): CharacterPF2e | NPCPF2e | null {
        return game.actors.get(this.data.data.master.id ?? '') ?? null;
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const data = this.data.data;
        const rules = this.items
            .reduce((rules: RuleElementPF2e[], item) => rules.concat(RuleElements.fromOwnedItem(item.data)), [])
            .filter((rule) => !rule.ignored);

        const gameActors = game.actors instanceof Actors ? game.actors : new Map();
        const master = gameActors.get(data.master?.id);

        // Ensure presence of "minion" trait
        data.traits.traits.value = data.traits.traits.value
            .concat('minion')
            .filter((trait, index, self) => self.indexOf(trait) === index);

        if (master instanceof CharacterPF2e || master instanceof NPCPF2e) {
            data.master.ability ||= 'cha';
            data.details.level.value = master.level;
            const spellcastingAbilityModifier = master.data.data.abilities[data.master.ability].mod;

            // base size
            data.traits.size.value = 'tiny';

            // base senses
            data.traits.senses = [{ type: 'lowLightVision', label: 'PF2E.SensesLowLightVision', value: '' }];

            const { statisticsModifiers } = this.prepareCustomModifiers(rules);
            const modifierTypes: string[] = [MODIFIER_TYPE.ABILITY, MODIFIER_TYPE.PROFICIENCY, MODIFIER_TYPE.ITEM];
            const filter_modifier = (modifier: ModifierPF2e) => !modifierTypes.includes(modifier.type);

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
                        .filter(filter_modifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m));
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

            // hit points
            {
                const modifiers = [new ModifierPF2e('PF2E.MasterLevelHP', this.level * 5, MODIFIER_TYPE.UNTYPED)];
                (statisticsModifiers.hp || [])
                    .filter(filter_modifier)
                    .map((m) => duplicate(m))
                    .forEach((m) => modifiers.push(m));
                (statisticsModifiers['hp-per-level'] || [])
                    .filter(filter_modifier)
                    .map((m) => duplicate(m))
                    .forEach((m) => {
                        m.modifier *= data.details.level.value;
                        modifiers.push(m);
                    });

                const stat = mergeObject(new StatisticModifier('hp', modifiers), data.attributes.hp, {
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
                const base = 10 + new StatisticModifier('base', source).totalModifier;
                const modifiers = [];
                ['ac', 'dex-based', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filter_modifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = mergeObject(new StatisticModifier('ac', modifiers), data.attributes.ac, {
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
                const source = save.modifiers.filter(
                    (modifier: ModifierPF2e) => !['status', 'circumstance'].includes(modifier.type),
                );
                const modifiers = [
                    new ModifierPF2e(
                        `PF2E.MasterSavingThrow.${saveName}`,
                        new StatisticModifier('base', source).totalModifier,
                        MODIFIER_TYPE.UNTYPED,
                    ),
                ];
                const ability = (save.ability as AbilityString) ?? CONFIG.PF2E.savingThrowDefaultAbilities[saveName];
                [save.name, `${ability}-based`, 'saving-throw', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filter_modifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = new StatisticModifier(CONFIG.PF2E.saves[saveName], modifiers);
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event: JQuery.TriggeredEvent, options = [], callback?: (roll: Roll) => void) => {
                    const label = game.i18n.format('PF2E.SavingThrowWithName', {
                        saveName: game.i18n.localize(CONFIG.PF2E.saves[save.name]),
                    });
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
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
                    new ModifierPF2e('PF2E.MasterLevel', data.details.level.value, MODIFIER_TYPE.UNTYPED),
                ];
                ['attack', 'mundane-attack', 'attack-roll', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filter_modifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = new StatisticModifier('attack', modifiers);
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (event: JQuery.TriggeredEvent, options = [], callback?: (roll: Roll) => void) => {
                    CheckPF2e.roll(
                        new CheckModifier('Attack Roll', stat),
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
                    new ModifierPF2e('PF2E.MasterLevel', data.details.level.value, MODIFIER_TYPE.UNTYPED),
                    new ModifierPF2e(
                        `PF2E.MasterAbility.${data.master.ability}`,
                        spellcastingAbilityModifier,
                        MODIFIER_TYPE.UNTYPED,
                    ),
                ];
                ['perception', 'wis-based', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filter_modifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = mergeObject(new StatisticModifier('perception', modifiers), data.attributes.perception, {
                    overwrite: false,
                });
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = adaptRoll((args) => {
                    const label = game.i18n.localize('PF2E.PerceptionCheck');
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'perception-check', options: args.options ?? [], dc: args.dc },
                        args.event,
                        args.callback,
                    );
                });
                data.attributes.perception = stat;
            }

            // skills
            for (const [shortform, skillName] of Object.entries(CONFIG.PF2E.skills)) {
                const modifiers = [
                    new ModifierPF2e('PF2E.MasterLevel', data.details.level.value, MODIFIER_TYPE.UNTYPED),
                ];
                if (['acr', 'ste'].includes(shortform)) {
                    modifiers.push(
                        new ModifierPF2e(
                            `PF2E.MasterAbility.${data.master.ability}`,
                            spellcastingAbilityModifier,
                            MODIFIER_TYPE.UNTYPED,
                        ),
                    );
                }
                const expanded = SKILL_DICTIONARY[shortform as SkillAbbreviation];
                const ability = SKILL_EXPANDED[expanded].ability;
                [expanded, `${ability}-based`, 'skill-check', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filter_modifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const label = objectHasKey(CONFIG.PF2E.skills, skillName) ? CONFIG.PF2E.skills[skillName] : skillName;
                const stat = new StatisticModifier(label, modifiers);
                stat.value = stat.totalModifier;
                stat.ability = ability;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = adaptRoll((args) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', {
                        skillName: game.i18n.localize(CONFIG.PF2E.skills[shortform]),
                    });
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options: args.options ?? [], dc: args.dc },
                        args.event,
                        args.callback,
                    );
                });
                data.skills[shortform] = stat;
            }
        }
    }

    async createEmbeddedEntity<I extends ItemDataPF2e>(
        embeddedName: string,
        data: I,
        options?: EntityCreateOptions,
    ): Promise<I | null>;
    async createEmbeddedEntity<I extends ItemDataPF2e>(
        embeddedName: string,
        data: I[],
        options?: EntityCreateOptions,
    ): Promise<I | I[] | null>;
    async createEmbeddedEntity<I extends ItemDataPF2e>(
        embeddedName: string,
        data: I | I[],
        options: EntityCreateOptions = {},
    ): Promise<I | I[] | null> {
        const createData = Array.isArray(data) ? data : [data];
        for (const datum of createData) {
            if (!['condition', 'effect'].includes(datum.type)) {
                ui.notifications.error(game.i18n.localize('PF2E.FamiliarItemTypeError'));
                return null;
            }
        }

        return super.createEmbeddedEntity(embeddedName, createData, options);
    }
}

export interface FamiliarPF2e {
    data: FamiliarData;
    _data: FamiliarData;
}
