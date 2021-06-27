import { ActorPF2e } from '@actor/index';
import { ItemPF2e } from '@item/index';
import { SelectableTagField, TagSelectorOptions } from './index';

export abstract class TraitSelectorBase<
    EntityType extends ActorPF2e | ItemPF2e = ActorPF2e | ItemPF2e,
> extends FormApplication<EntityType> {
    choices: Record<string, string>;
    objectProperty = '';

    constructor(object: EntityType, options: TagSelectorOptions = {}) {
        super(object, options);
        this.choices = this.getChoices();
    }

    protected abstract get configTypes(): readonly SelectableTagField[];

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'trait-selector',
            classes: ['pf2e'],
            width: 'auto',
            height: 700,
        });
    }

    protected abstract override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

    /**
     * Builds an object of all keys of this.configTypes from CONFIG.PF2E
     * @returns An object of all key and translated value pairs sorted by key
     */
    private getChoices(): Record<string, string> {
        const choices = this.configTypes.reduce(
            (types, key) => mergeObject(types, CONFIG.PF2E[key]),
            {} as Record<string, string>,
        );
        return this.sortChoices(choices);
    }

    /** Sort and localize choices */
    protected sortChoices(choices: Record<string, string>): Record<string, string> {
        const sorted: Record<string, string> = {};
        Object.keys(choices)
            .sort((a, b) => {
                return choices[a].localeCompare(choices[b]);
            })
            .forEach((key) => {
                sorted[key] = game.i18n.localize(choices[key]);
            });

        return sorted;
    }
}

export interface TraitSelectorBase {
    options: TagSelectorOptions;
}
