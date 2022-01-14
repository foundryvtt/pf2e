import { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";
import { TagSelectorBase } from "./base";
import { SelectableTagField } from ".";

export class WeaknessSelector extends TagSelectorBase<ActorPF2e> {
    override objectProperty = "data.traits.dv";

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/trait-selector/weaknesses.html",
            title: "PF2E.WeaknessesLabel",
        });
    }

    private get actor(): ActorPF2e {
        return this.object;
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["weaknessTypes"] as const;
    }

    override getData() {
        const data: any = super.getData();

        const actorSource = this.actor.toObject();
        if (actorSource.type === "npc") {
            data.hasExceptions = true;
        } else if (actorSource.type === "familiar") {
            throw ErrorPF2e("Weaknesses cannot be saved to familiar data");
        }

        const choices: Record<string, { label: string; selected: boolean; value: number | undefined }> = {};
        const weaknesses = actorSource.data.traits.dv;
        Object.entries(this.choices).forEach(([type, label]) => {
            const current = weaknesses.find((weakness) => weakness.type === type);
            choices[type] = {
                label,
                selected: !!current,
                value: current?.value,
            };
        });
        data.choices = choices;

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

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const update = this.getUpdateData(formData);
        this.actor.update({ [this.objectProperty]: update });
    }

    protected getUpdateData(formData: Record<string, unknown>) {
        const choices: Record<string, unknown>[] = [];
        for (const [k, v] of Object.entries(formData as Record<string, any>)) {
            if (v.length > 1 && v[0]) {
                if (Number.isInteger(Number(v[1])) && v[1] !== "") {
                    choices.push({ type: k, value: Number(v[1]) });
                }
            }
        }
        return choices;
    }
}
