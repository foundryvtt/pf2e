import { ActorPF2e } from "@actor";
import { BaseTagSelector } from "./base";
import { SelectableTagField } from ".";
import { ErrorPF2e } from "@util";

export class SenseSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.traits.senses";

    static override get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/tag-selector/senses.hbs",
            title: "PF2E.Actor.Creature.Sense.Label",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["senses"] as const;
    }

    override async getData(): Promise<SenseSelectorData<TActor>> {
        if (!this.object.isOfType("character")) {
            throw ErrorPF2e("The Sense selector is usable only with PCs");
        }

        const senses = this.object.system.traits.senses;
        const choices = Object.entries(this.choices).reduce((accum: Record<string, SenseChoiceData>, [type, label]) => {
            const sense = senses.find((sense) => sense.type === type);
            return {
                ...accum,
                [type]: {
                    acuity: sense?.acuity ?? "precise",
                    disabled: !!sense?.source,
                    label,
                    selected: !!sense,
                    value: sense?.value ?? "",
                },
            };
        }, {});

        return {
            ...(await super.getData()),
            hasExceptions: false,
            choices,
            senseAcuity: CONFIG.PF2E.senseAcuity,
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

    protected override async _updateObject(_event: Event, formData: SenseFormData): Promise<void> {
        const update = Object.entries(formData)
            .filter(
                (e): e is [string, [true, string, string | null] | true] =>
                    e[1] === true || (Array.isArray(e[1]) && e[1][0])
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

        this.object.update({ [this.objectProperty]: update });
    }
}

interface SenseSelectorData<TActor extends ActorPF2e> extends FormApplicationData<TActor> {
    hasExceptions: boolean;
    choices: Record<string, SenseChoiceData>;
    senseAcuity: Record<string, string>;
}

interface SenseChoiceData {
    selected: boolean;
    disabled: boolean;
    acuity: string;
    label: string;
    value: string;
}

type SenseFormData = Record<string, [boolean, string, string | null] | boolean>;
