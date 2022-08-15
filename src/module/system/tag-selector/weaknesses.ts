import { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";
import { BaseTagSelector } from "./base";
import { SelectableTagField } from ".";

export class WeaknessSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.traits.dv";

    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/system/trait-selector/weaknesses.html",
            title: "PF2E.WeaknessesLabel",
        };
    }

    private get actor(): TActor {
        return this.object;
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["weaknessTypes"] as const;
    }

    override async getData(): Promise<WeaknessSelectorData<TActor>> {
        if (!this.actor.isOfType("character", "hazard", "npc", "vehicle")) {
            throw ErrorPF2e("Weaknesses can only be saved to PCs, NPCs, hazards, and vehicles");
        }

        const weaknesses = this.actor._source.system.traits.dv;
        const choices = Object.entries(this.choices).reduce((accum: Record<string, ChoiceData>, [type, label]) => {
            const weakness = weaknesses.find((w) => w.type === type);
            return {
                ...accum,
                [type]: {
                    label,
                    selected: !!weakness,
                    value: Number(weakness?.value) || 0,
                    exceptions: weakness?.exceptions ?? "",
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

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
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

interface WeaknessSelectorData<TActor extends ActorPF2e> extends FormApplicationData<TActor> {
    choices: Record<string, ChoiceData>;
    hasExceptions: boolean;
}

interface ChoiceData {
    label: string;
    selected: boolean;
    value: number;
    exceptions: string;
}
