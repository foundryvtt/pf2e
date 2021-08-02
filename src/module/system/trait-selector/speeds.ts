import { ActorPF2e } from "@actor/base";
import { NPCPF2e } from "@actor/npc";
import { LabeledValue } from "@module/data";
import { TagSelectorBase } from "./base";
import { SelectableTagField } from "./index";

export class TraitSelectorSpeeds extends TagSelectorBase<ActorPF2e> {
    override objectProperty = "data.attributes.speed.otherSpeeds";

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/trait-selector/speed-types.html",
            title: "PF2E.SpeedTypes",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["speedTypes"] as const;
    }

    override getData() {
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
                value: res?.value ?? "",
            };
        });
        data.choices = choices;

        return data;
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);

        $html
            .find<HTMLInputElement>("input[id^=input_value]")
            .on("focusin", (event) => {
                const input = $(event.currentTarget);
                input.prev().prev().prop("checked", true);
            })
            .on("focusout", (event) => {
                const input = $(event.currentTarget);
                if (!input.val()) {
                    input.prev().prev().prop("checked", false);
                }
            });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>) {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: Record<string, unknown>) {
        type TagChoice = { type: string; label: string; value: string };
        const choices: TagChoice[] = [];
        for (const [k, v] of Object.entries(formData as Record<string, any>)) {
            if (v.length > 1 && Array.isArray(v) && v[0]) {
                if (!Number.isNaN(Number(v[1])) && v[1]) {
                    const label = this.choices[k];
                    choices.push({ type: k, label, value: v[1] });
                }
            }
        }
        return choices;
    }
}

export interface TraitSelectorSpeeds {
    options: FormApplicationOptions;
}
