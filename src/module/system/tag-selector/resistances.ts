import { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";
import { SelectableTagField } from ".";
import { TagSelectorBase } from "./base";

export class ResistanceSelector extends TagSelectorBase<ActorPF2e> {
    override objectProperty = "data.traits.dr";

    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "trait-selector",
            classes: ["pf2e"],
            template: "systems/pf2e/templates/system/trait-selector/resistances.html",
            title: "PF2E.ResistancesLabel",
            width: "auto",
            height: 700,
        };
    }

    private get actor(): ActorPF2e {
        return this.object;
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["resistanceTypes"] as const;
    }

    override getData() {
        const actorSource = this.actor.toObject();
        if (actorSource.type === "familiar") {
            throw ErrorPF2e("Resistances cannot be saved to familiar data");
        }

        const data: any = super.getData();

        if (actorSource.type === "npc" || actorSource.type === "hazard") {
            data.hasExceptions = true;
        }

        const choices: Record<
            string,
            { label: string; selected: boolean; value: number | undefined; exceptions: string }
        > = {};
        const resistances = actorSource.data.traits.dr;
        Object.entries(this.choices).forEach(([type, label]) => {
            const resistance = resistances.find((resistance) => resistance.type === type);
            choices[type] = {
                label,
                selected: !!resistance,
                value: resistance?.value,
                exceptions: resistance?.exceptions ?? "",
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

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>) {
        const update = this.getUpdateData(formData);
        if (update) this.actor.update({ [this.objectProperty]: update });
    }

    protected getUpdateData(formData: Record<string, unknown>) {
        const choices: Record<string, unknown>[] = [];
        for (const [k, v] of Object.entries(formData as Record<string, any>)) {
            if (v.length > 1 && v[0]) {
                if (Number.isInteger(Number(v[1])) && v[1] !== "") {
                    const exceptions = v[2] ?? "";
                    choices.push({ type: k, value: Number(v[1]), exceptions });
                }
            }
        }
        return choices;
    }
}
