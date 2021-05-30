import { ActorPF2e } from '@actor/base';
import { NPCPF2e } from '@actor/npc';
import { LabeledValue } from '@module/data';
import { TraitSelectorBase } from './base';
import { SelectableTagField } from './index';

export class TraitSelectorWeaknesses extends TraitSelectorBase<ActorPF2e> {
    objectProperty = 'data.traits.dv';

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/pf2e/templates/system/trait-selector/weaknesses.html',
            title: 'PF2E.WeaknessesLabel',
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ['weaknessTypes'] as const;
    }

    /** @override */
    getData() {
        const data: any = super.getData();

        if (this.object instanceof NPCPF2e) {
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
    protected async _updateObject(_event: Event, formData: Record<string, unknown>) {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: Record<string, unknown>) {
        const choices: Record<string, unknown>[] = [];
        for (const [k, v] of Object.entries(formData as Record<string, any>)) {
            if (v.length > 1 && v[0]) {
                if (!Number.isNaN(Number(v[1])) && v[1] !== '') {
                    const label = this.choices[k];
                    choices.push({ type: k, label, value: v[1] });
                }
            }
        }
        return choices;
    }
}

export interface TraitSelectorWeaknesses {
    options: FormApplicationOptions;
}
