import { SenseAcuity, SenseData } from "@actor/creature/data";
import { ActorPF2e, NPCPF2e } from "@actor/index";
import { TagSelectorBase } from "./base";
import { SelectableTagField } from "./index";

export class TraitSelectorSenses extends TagSelectorBase<ActorPF2e> {
    override objectProperty = "data.traits.senses";
    protected customSenses: SenseData[] = [];
    protected customSensesInitialized = false;

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/trait-selector/senses.html",
            title: "PF2E.Senses",
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
        const basicSenses = senses.filter((sense) => sense.type !== "custom");

        //Enrich list of choices with actor sense data
        Object.entries(this.choices).forEach(([type, label]) => {
            const sense = basicSenses.find((sense) => sense.type === type);
            choices[type] = {
                acuity: sense?.acuity ?? "precise",
                disabled: sense?.source ? "disabled" : "",
                label,
                specialSense: sense?.specialSense ?? false,
                selected: sense !== undefined,
                value: sense?.value ?? "",
            };
        });

        data.choices = choices;
        data.senseAcuity = CONFIG.PF2E.senseAcuity;
        if (!this.customSensesInitialized) {
            this.customSensesInitialized = true;
            this.customSenses = senses.filter((sense) => sense.type === "custom");
        }
        data.customSenses = this.customSenses;

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

        //Add custom senses
        $html.find(".add-custom-sense").on("click", (_event) => {
            const customSense: SenseData = {
                type: "custom",
                acuity: $html.find("select[name=custom-sense-acuity]").find(":selected").val() as SenseAcuity,
                specialSense: $html.find("input[name=custom-sense-special]").is(":checked"),
                source: undefined,
                value: $html.find("input[name=custom-sense-value]").val() as string,
                label: $html.find("input[name=custom-sense-label]").val() as string,
            };
            this.customSenses.push(customSense);

            this.render();
        });

        //Delete custom sense
        $html.find("i[name^=delete_sense_]").on("click", (_event) => {
            if (_event.currentTarget.dataset.sense)
                this.customSenses.splice(parseInt(_event.currentTarget.dataset.sense), 1);

            this.render();
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
            if (Array.isArray(v)) {
                if (v.length > 1 && v[0]) {
                    if (!Number.isNaN(Number(v[2]))) {
                        const label = this.choices[k];
                        choices.push({ type: k, label, value: v[2], acuity: v[1], specialSense: v[3] });
                    }
                }
            }
        }
        for (const cs of this.customSenses) {
            choices.push({
                type: cs.type,
                label: cs.label,
                value: cs.value,
                acuity: cs.acuity,
                specialSense: cs.specialSense,
            });
        }
        return choices;
    }
}
