import { ActorSourcePF2e } from '@actor/data';
import { ActorPF2e } from '@actor/index';
import { ItemSourcePF2e } from '@item/data';
import { ItemPF2e } from '@item/index';
import { ValuesList } from '@module/data';
import { TraitSelectorBase } from './base';
import { BasicSelectorOptions, SelectableTagField } from './index';

export class TagSelectorBasic extends TraitSelectorBase {
    allowCustom: boolean;
    searchString = '';
    private filterTimeout: number | null = null;

    constructor(object: ActorPF2e | ItemPF2e, options: BasicSelectorOptions) {
        super(object, options);
        this.objectProperty = options.objectProperty;
        this.allowCustom = options.allowCustom ?? true;
        if (options.customChoices) {
            mergeObject(this.choices, options.customChoices);
            this.choices = this.sortChoices(this.choices);
        }
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return this.options.configTypes ?? [];
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/pf2e/templates/system/trait-selector/basic.html',
            title: 'PF2E.BrowserFilterTraits',
            height: 710,
        });
    }

    override getData() {
        const property: ValuesList = getProperty(
            (this.object as { toObject(): ActorSourcePF2e | ItemSourcePF2e }).toObject(),
            this.objectProperty,
        );
        const chosen: string[] = (property.value ?? []).map((prop) => prop.toString());

        const custom = this.allowCustom ? property.custom : null;

        const choices = Object.keys(this.choices).reduce((accumulated, type) => {
            accumulated[type] = {
                label: this.choices[type],
                selected: chosen.includes(type) || chosen.includes(type.toLowerCase()),
            };
            return accumulated;
        }, {} as Record<string, { label: string; selected: boolean }>);

        return {
            ...super.getData(),
            choices,
            allowCustom: this.allowCustom,
            custom,
        };
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);

        // Search filtering
        $html.find<HTMLInputElement>('input[id="search"]').on('keyup', (event) => this.onFilterResults(event));
        if (this.searchString) {
            this.search(this.searchString);
        }
    }

    protected async _updateObject(_event: Event, formData: Record<string, unknown>) {
        const value = this.getUpdateData(formData);
        if (this.allowCustom && typeof formData['custom'] === 'string') {
            this.object.update({ [this.objectProperty]: { value, custom: formData['custom'] } });
        } else {
            this.object.update({ [`${this.objectProperty}.value`]: value });
        }
    }

    private getUpdateData(formData: Record<string, unknown>) {
        const choices: string[] = [];
        Object.entries(formData).forEach(([language, selected]) => {
            if (selected) {
                choices.push(language);
            }
        });
        return choices;
    }

    /**
     * Filter the potential traits to only show ones which match a provided search string
     * @param searchString The search string to match
     */
    private search(searchString: string) {
        const query = new RegExp((RegExp as any).escape(searchString), 'i');
        (this.element as JQuery).find('li.trait-item').each((_i, li) => {
            const name = li.getElementsByClassName('trait-label')[0].textContent ?? '';
            li.style.display = query.test(name) ? 'flex' : 'none';
        });
        this.searchString = searchString;
    }

    /**
     * Handle trait filtering through search field
     * Toggle the visibility of indexed trait entries by name match
     */
    private onFilterResults(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const input: HTMLFormElement = event.currentTarget;
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
            this.filterTimeout = null;
        }
        this.filterTimeout = window.setTimeout(() => this.search(input.value), 100);
    }
}

export interface TagSelectorBasic {
    options: BasicSelectorOptions;
}
