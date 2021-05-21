import { ActorPF2e, HazardPF2e } from '@actor/base';
import { NPCPF2e } from '@actor/npc';
import { LabeledValue } from '@actor/data-definitions';
import { TraitSelectorBase } from './base';
import { SelectableTagField } from './index';

export class TraitSelectorResistances extends TraitSelectorBase<ActorPF2e> {
    objectProperty = 'data.traits.dr';

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'trait-selector',
            classes: ['pf2e'],
            template: 'systems/pf2e/templates/system/trait-selector/resistances.html',
            title: 'PF2E.ResistancesLabel',
            width: 'auto',
            height: 700,
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ['resistanceTypes'] as const;
    }

    /** @override */
    getData() {
        const data: any = super.getData();

        if (this.object instanceof NPCPF2e || this.object instanceof HazardPF2e) {
            data.hasExceptions = true;
        }

        const choices: any = {};
        const resistances: LabeledValue[] = getProperty(this.object.data, this.objectProperty);
        Object.entries(this.choices).forEach(([type, label]) => {
            const res = resistances.find((res) => res.type === type);
            choices[type] = {
                label,
                selected: res !== undefined,
                value: res?.value ?? '',
                exceptions: res?.exceptions ?? '',
            };
        });
        data.choices = choices;

        return data;
    }

    /** @override */
    activateListeners($html: JQuery) {
        super.activateListeners($html);

        $html
            .find<HTMLInputElement>('input[id^=input_value]')
            .on('focusin', (event) => {
                const input = $(event.currentTarget);
                input.prev().prev().prop('checked', true);
            })
            .on('focusout', (event) => {
                const input = $(event.currentTarget);
                if (!input.val()) {
                    input.prev().prev().prop('checked', false);
                }
            });
    }

    /** @override */
    protected async _updateObject(_event: Event, formData: FormData) {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: FormData) {
        const choices: Record<string, unknown>[] = [];
        for (const [k, v] of Object.entries(formData as Record<any, any>)) {
            if (v.length > 1 && v[0]) {
                if (!Number.isNaN(Number(v[1])) && v[1] !== '') {
                    const label = this.choices[k];
                    const exceptions = v[2] ?? '';
                    choices.push({ type: k, label, value: v[1], exceptions });
                }
            }
        }
        return choices;
    }
}

export interface TraitSelectorResistances {
    options: FormApplicationOptions;
}
