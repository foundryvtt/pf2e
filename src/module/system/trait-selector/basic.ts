import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ErrorPF2e } from '@module/utils';
import { TraitSelectorBase } from './base';
import { TraitSelectorOptions } from './index';

export class TraitSelectorBasic extends TraitSelectorBase {
    object: ActorPF2e | ItemPF2e;
    choices: Record<string, string>;
    allowCustom: boolean;
    searchString = '';
    _filterTimeout: number | null = null;

    constructor(object: ActorPF2e | ItemPF2e, selectorOptions?: TraitSelectorOptions) {
        super(selectorOptions?.formOptions);

        if (object instanceof ActorPF2e || object instanceof ItemPF2e) {
            this.object = object;
            const options = selectorOptions?.basicTraitSelector;
            if (options?.objectProperty && options?.configTypes) {
                this.objectProperty = options.objectProperty;
                this.configTypes = options.configTypes;
                this.allowCustom = options?.allowCustom ?? true;
                this.choices = this.getChoices();
                if (options?.customChoices) {
                    mergeObject(this.choices, options.customChoices);
                    this.choices = this.sortChoices(this.choices);
                }
            } else {
                throw ErrorPF2e(`Invalid arguments for the basic trait selector.`);
            }
        } else {
            throw ErrorPF2e('The first argument must be an actor or an item.');
        }
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'trait-selector',
            classes: ['pf2e'],
            template: 'systems/pf2e/templates/system/trait-selector/basic.html',
            title: 'PF2E.BrowserFilterTraits',
            width: 'auto',
            height: 710,
        });
    }

    /** @override */
    getData() {
        const data: any = super.getData();

        const property = getProperty(this.object.data, this.objectProperty);
        const chosen: string[] = property.value ?? [];

        if (this.allowCustom) {
            data.allowCustom = true;
            data.custom = property.custom;
        }

        const choices: any = {};
        Object.entries(this.choices).forEach(([type, label]) => {
            choices[type] = {
                label,
                selected: chosen.includes(type),
            };
        });
        data.choices = choices;

        return data;
    }

    /** @override */
    activateListeners($html: JQuery) {
        super.activateListeners($html);

        // Search filtering
        $html.find('input[id="search"]').on('keyup', this._onFilterResults.bind(this));
        if (this.searchString) {
            this.search(this.searchString);
        }
    }

    /** @override */
    protected async _updateObject(_event: Event, formData: FormData) {
        const value = this.getUpdateData(formData);
        if (this.allowCustom && 'custom' in formData) {
            this.object.update({ [this.objectProperty]: { value, custom: formData['custom'] } });
        } else {
            this.object.update({ [`${this.objectProperty}.value`]: value });
        }
    }

    protected getUpdateData(formData: FormData) {
        const choices: string[] = [];
        Object.entries(formData as Record<any, any>).forEach(([language, selected]) => {
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
    protected search(searchString: string) {
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
    protected _onFilterResults(event: Event) {
        event.preventDefault();
        const input = event.currentTarget as HTMLFormElement;
        if (this._filterTimeout) {
            clearTimeout(this._filterTimeout);
            this._filterTimeout = null;
        }
        this._filterTimeout = window.setTimeout(() => this.search(input.value), 100);
    }
}
