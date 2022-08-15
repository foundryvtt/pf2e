import { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";
import { SelectableTagField } from ".";
import { BaseTagSelector } from "./base";

export class ResistanceSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.traits.dr";

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

    private get actor(): TActor {
        return this.object;
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["resistanceTypes"] as const;
    }

    override async getData(): Promise<ResistanceSelectorData<TActor>> {
        if (!this.actor.isOfType("character", "hazard", "npc", "vehicle")) {
            throw ErrorPF2e("Resistances can only be saved to PCs, NPCs, hazards, and vehicles");
        }

        const resistances = this.actor._source.system.traits.dr;
        const choices = Object.entries(this.choices).reduce((accum: Record<string, ChoiceData>, [type, label]) => {
            const resistance = resistances.find((r) => r.type === type);
            return {
                ...accum,
                [type]: {
                    label,
                    selected: !!resistance,
                    value: Number(resistance?.value) || 0,
                    exceptions: resistance?.exceptions ?? "",
                },
            };
        }, {});

        return {
            ...(await super.getData()),
            choices,
            hasExceptions: this.actor.isOfType("hazard", "npc"),
        };
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
        const selections = Object.entries(formData).flatMap(([type, values]): object => {
            if (Array.isArray(values) && values.length > 1 && values[0]) {
                const value = Number(values[1]);
                if (Number.isInteger(value) && value > 0) {
                    return { type, value, exceptions: String(values[2] ?? "") };
                }
            }
            return [];
        });

        this.actor.update({ [this.objectProperty]: selections });
    }
}

interface ResistanceSelectorData<TActor extends ActorPF2e> extends FormApplicationData<TActor> {
    choices: Record<string, ChoiceData>;
    hasExceptions: boolean;
}

interface ChoiceData {
    label: string;
    selected: boolean;
    value: number;
    exceptions: string;
}
