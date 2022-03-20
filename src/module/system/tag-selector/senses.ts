import { SenseData } from "@actor/creature/data";
import { ActorPF2e, NPCPF2e } from "@actor/index";
import { TagSelectorBase } from "./base";
import { SelectableTagField } from ".";

export class SenseSelector extends TagSelectorBase<ActorPF2e> {
    override objectProperty = "data.traits.senses";

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/trait-selector/senses.html",
            title: "PF2E.Sense.Label",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["senses"] as const;
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
                acuity: sense?.acuity ?? "precise",
                disabled: sense?.source ? "disabled" : "",
                label,
                selected: sense !== undefined,
                value: sense?.value ?? "",
            };
        });
        data.choices = choices;

        data.senseAcuity = CONFIG.PF2E.senseAcuity;

        return data;
    }

    override activateListeners($html: JQuery): void {
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

    protected override async _updateObject(_event: Event, formData: SenseFormData): Promise<void> {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: SenseFormData): SenseUpdateData[] {
        return Object.entries(formData)
            .filter(
                (entry): entry is [string, [true, string, string?] | true] =>
                    entry[1] === true || (Array.isArray(entry[1]) && entry[1].length === 3)
            )
            .map(([type, values]) => {
                if (values === true) {
                    return { type };
                } else if (!Number(values[2])) {
                    const acuity = values[1];
                    return { type, acuity };
                } else {
                    const acuity = values[1];
                    const range = Number(values[2]);
                    return { type, acuity, value: range };
                }
            });
    }
}

type SenseFormData = Record<string, [boolean, string, string?] | boolean>;
interface SenseUpdateData {
    type: string;
    acuity?: string;
    value?: number;
}
