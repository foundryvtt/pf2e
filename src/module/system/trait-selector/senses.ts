import { SenseData } from '@actor/creature/data';
import { ActorPF2e, NPCPF2e } from '@actor/index';
import { TagSelectorBase } from './base';
import { SelectableTagField } from './index';

export class TraitSelectorSenses extends TagSelectorBase<ActorPF2e> {
    override objectProperty = 'data.traits.senses';

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/pf2e/templates/system/trait-selector/senses.html',
            title: 'PF2E.Senses',
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ['senses'] as const;
    }

    override getData() {
        const data: any = super.getData();

        if (this.object instanceof NPCPF2e) {
            data.hasExceptions = true;
        }

        const choices: Record<string, Record<string, unknown>> = {};
        const senses: SenseData[] = getProperty(this.object.data, this.objectProperty);
        Object.entries(this.choices).forEach(([type, label]) => {
            const sense = senses.find((sense) => sense.type === type);
            choices[type] = {
                acuity: sense?.acuity ?? '',
                disabled: sense?.source ? 'disabled' : '',
                label,
                selected: sense !== undefined,
                value: sense?.value ?? '',
            };
        });
        data.choices = choices;

        return data;
    }

    override activateListeners($html: JQuery) {
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

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: Record<string, unknown>) {
        const choices: Record<string, unknown>[] = [];
        for (const [k, v] of Object.entries(formData as Record<string, any>)) {
            if (v.length > 1 && v[0]) {
                if (!Number.isNaN(Number(v[1]))) {
                    const label = this.choices[k];
                    choices.push({ type: k, label, value: v[1] });
                }
            }
        }
        return choices;
    }
}

export interface TraitSelectorSenses {
    options: FormApplicationOptions;
}
