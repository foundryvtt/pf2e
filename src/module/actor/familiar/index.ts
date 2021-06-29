import { SAVE_TYPES, SKILL_ABBREVIATIONS, SKILL_DICTIONARY, SKILL_EXPANDED } from '@actor/data/values';
import { CharacterPF2e, NPCPF2e } from '@actor/index';
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from '@module/modifiers';
import { CheckPF2e, RollParameters } from '@system/rolls';
import { RuleElementPF2e, RuleElements } from '@module/rules/rules';
import { CreaturePF2e } from '../creature';
import { ItemSourcePF2e } from '@item/data';
import { ActiveEffectPF2e } from '@module/active-effect';
import { ItemPF2e } from '@item/base';
import { FamiliarData } from './data';

export class FamiliarPF2e extends CreaturePF2e {
    static override get schema(): typeof FamiliarData {
        return FamiliarData;
    }

    /** The familiar's master, if selected */
    get master(): CharacterPF2e | NPCPF2e | null {
        const actor = game.actors?.get(this.data.data.master.id ?? '');
        if (actor instanceof CharacterPF2e || actor instanceof NPCPF2e) {
            return actor;
        }
        return null;
    }

    /** Set base emphemeral data for later updating by derived-data preparation */
    override prepareBaseData() {
        super.prepareBaseData();

        const systemData = this.data.data;
        systemData.details.level = { value: 0 };
        systemData.traits.size.value = 'tiny';
        systemData.traits.traits = { value: ['minion'], custom: '' };
        systemData.traits.senses = [{ type: 'lowLightVision', label: 'PF2E.SensesLowLightVision', value: '' }];
    }

    /** Active effects on a familiar require a master, so wait until embedded documents are prepared */
    override applyActiveEffects(): void {
        return;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const master = this.master;
        this.data.data.details.level.value = master?.level ?? 0;

        // Apply active effects now that the master (if selected) is ready.
        super.applyActiveEffects();

        const data = this.data.data;
        const rules = this.items
            .reduce((rules: RuleElementPF2e[], item) => rules.concat(RuleElements.fromOwnedItem(item.data)), [])
            .filter((rule) => !rule.ignored);

        // Ensure uniqueness of traits
        data.traits.traits.value = [...this.traits].sort();

        if (master) {
            data.master.ability ||= 'cha';
            const spellcastingAbilityModifier = master.data.data.abilities[data.master.ability].mod;

            const { statisticsModifiers } = this.prepareCustomModifiers(rules);
            const modifierTypes: string[] = [MODIFIER_TYPE.ABILITY, MODIFIER_TYPE.PROFICIENCY, MODIFIER_TYPE.ITEM];
            const filterModifier = (modifier: ModifierPF2e) => !modifierTypes.includes(modifier.type);

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
                const modifiers: ModifierPF2e[] = [];
                [`${speed.type}-speed`, 'speed'].forEach((key) => {
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
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
                const modifiers = [
                    new ModifierPF2e('PF2E.MasterLevelHP', this.level * 5, MODIFIER_TYPE.UNTYPED),
                    ...this.data.data.attributes.hp.modifiers,
                ];
                (statisticsModifiers.hp || [])
                    .filter(filterModifier)
                    .map((m) => duplicate(m))
                    .forEach((m) => modifiers.push(m));
                (statisticsModifiers['hp-per-level'] || [])
                    .filter(filterModifier)
                    .map((m) => duplicate(m))
                    .forEach((m) => {
                        m.modifier *= data.details.level.value;
                        modifiers.push(m);
                    });

                const hpData = duplicate(data.attributes.hp);
                delete (hpData as any).modifiers;

                const stat = mergeObject(new StatisticModifier('hp', modifiers), hpData, {
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
                const modifiers: ModifierPF2e[] = [];
                ['ac', 'dex-based', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
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
            for (const saveName of SAVE_TYPES) {
                const save = master.data.data.saves[saveName];
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
                const ability = save.ability ?? CONFIG.PF2E.savingThrowDefaultAbilities[saveName];
                [save.name, `${ability}-based`, 'saving-throw', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const stat = new StatisticModifier(CONFIG.PF2E.saves[saveName], modifiers);
                stat.value = stat.totalModifier;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (args: RollParameters) => {
                    const label = game.i18n.format('PF2E.SavingThrowWithName', {
                        saveName: game.i18n.localize(CONFIG.PF2E.saves[save.name]),
                    });
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'saving-throw', dc: args.dc, options: args.options },
                        args.event,
                        args.callback,
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
                        .filter(filterModifier)
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
                        .filter(filterModifier)
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
                stat.roll = (args: RollParameters) => {
                    const label = game.i18n.localize('PF2E.PerceptionCheck');
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'perception-check', options: args.options ?? [], dc: args.dc },
                        args.event,
                        args.callback,
                    );
                };
                data.attributes.perception = stat;
            }

            // skills
            for (const shortForm of SKILL_ABBREVIATIONS) {
                const longForm = SKILL_DICTIONARY[shortForm];
                const modifiers = [
                    new ModifierPF2e('PF2E.MasterLevel', data.details.level.value, MODIFIER_TYPE.UNTYPED),
                ];
                if (['acr', 'ste'].includes(shortForm)) {
                    modifiers.push(
                        new ModifierPF2e(
                            `PF2E.MasterAbility.${data.master.ability}`,
                            spellcastingAbilityModifier,
                            MODIFIER_TYPE.UNTYPED,
                        ),
                    );
                }
                const ability = SKILL_EXPANDED[longForm].ability;
                [longForm, `${ability}-based`, 'skill-check', 'all'].forEach((key) =>
                    (statisticsModifiers[key] || [])
                        .filter(filterModifier)
                        .map((m) => duplicate(m))
                        .forEach((m) => modifiers.push(m)),
                );
                const label = CONFIG.PF2E.skills[shortForm] ?? longForm;
                const stat = new StatisticModifier(label, modifiers);
                stat.value = stat.totalModifier;
                stat.ability = ability;
                stat.breakdown = stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? '' : '+'}${m.modifier}`)
                    .join(', ');
                stat.roll = (args: RollParameters) => {
                    const label = game.i18n.format('PF2E.SkillCheckWithName', {
                        skillName: game.i18n.localize(CONFIG.PF2E.skills[shortForm]),
                    });
                    CheckPF2e.roll(
                        new CheckModifier(label, stat),
                        { actor: this, type: 'skill-check', options: args.options ?? [], dc: args.dc },
                        args.event,
                        args.callback,
                    );
                };
                data.skills[shortForm] = stat;
            }
        }

        // Refresh vision of controlled tokens linked to this actor in case any of the above changed its senses
        this.refreshVision();
    }

    override async createEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context: DocumentModificationContext = {},
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        const createData = Array.isArray(data) ? data : [data];
        for (const datum of data) {
            if (!('type' in datum)) continue;
            if (!['condition', 'effect'].includes(datum.type ?? '')) {
                ui.notifications.error(game.i18n.localize('PF2E.FamiliarItemTypeError'));
                return [];
            }
        }

        return super.createEmbeddedDocuments(embeddedName, createData, context);
    }
}

export interface FamiliarPF2e {
    readonly data: FamiliarData;

    createEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: 'Item',
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext,
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        data: PreCreate<foundry.data.ActiveEffectSource>[] | Partial<ItemSourcePF2e>[],
        context?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}
