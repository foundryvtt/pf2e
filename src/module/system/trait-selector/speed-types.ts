import { ActorPF2e } from '@actor/base';
import { NPCPF2e } from '@actor/npc';
import { ItemPF2e } from '@item/base';
import { LabeledValue } from '@actor/data-definitions';
import { ErrorPF2e } from '@module/utils';
import { TraitSelectorBase } from './base';
import { TraitSelectorOptions } from './index';

export class TraitSelectorSpeedTypes extends TraitSelectorBase {
    object: ActorPF2e;
    configTypes = ['speedTypes'];
    objectProperty = 'data.attributes.speed.otherSpeeds';
    choices: Record<string, string>;

    constructor(object: ActorPF2e | ItemPF2e, options?: TraitSelectorOptions) {
        super(options?.formOptions);

        if (object instanceof ActorPF2e) {
            this.object = object;
            this.choices = this.getChoices();
        } else {
            throw ErrorPF2e('Object is not an actor!');
        }
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'trait-selector',
            classes: ['pf2e'],
            template: 'systems/pf2e/templates/system/trait-selector/speed-types.html',
            title: 'PF2E.SpeedTypes',
            width: 'auto',
            height: 700,
        });
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
    protected async _updateObject(_event: Event, formData: FormData) {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: FormData) {
        const choices = [];
        for (const [k, v] of Object.entries(formData as Record<any, any>)) {
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
