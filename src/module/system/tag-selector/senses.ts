import type { ActorPF2e } from "@actor";
import { SENSES_WITH_MANDATORY_ACUITIES } from "@actor/creature/values.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, objectHasKey } from "@util";
import { BaseTagSelector, TagSelectorData, TagSelectorOptions } from "./base.ts";
import { SelectableTagField } from "./index.ts";

class SenseSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.traits.senses";

    static override get defaultOptions(): TagSelectorOptions {
        return mergeObject(super.defaultOptions, {
            height: "auto",
            template: "systems/pf2e/templates/system/tag-selector/senses.hbs",
            id: "sense-selector",
            title: "PF2E.Actor.Creature.Sense.Label",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["senses"] as const;
    }

    override async getData(options?: Partial<TagSelectorOptions>): Promise<SenseSelectorData<TActor>> {
        if (!this.document.isOfType("character")) {
            throw ErrorPF2e("The Sense selector is usable only with PCs");
        }

        const senses = this.document.system.traits.senses;
        const choices = Object.entries(this.choices).reduce((accum: Record<string, SenseChoiceData>, [type, label]) => {
            const sense = senses.find((sense) => sense.type === type);
            const mandatoryAcuity = objectHasKey(SENSES_WITH_MANDATORY_ACUITIES, type);
            const acuity = mandatoryAcuity ? SENSES_WITH_MANDATORY_ACUITIES[type] : sense?.acuity ?? "precise";
            return {
                ...accum,
                [type]: {
                    acuity,
                    mandatoryAcuity,
                    disabled: !!sense?.source,
                    label,
                    selected: !!sense,
                    value: sense?.value ?? "",
                },
            };
        }, {});

        return {
            ...(await super.getData(options)),
            hasExceptions: false,
            choices,
            senseAcuity: CONFIG.PF2E.senseAcuity,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=number]")) {
            const checkbox = htmlQuery<HTMLInputElement>(htmlClosest(input, "tr"), "input[type=checkbox]");
            if (!checkbox) continue;

            input.addEventListener("input", () => {
                checkbox.checked = !!Number(input.value);
            });
        }
    }

    /** Clear checkboxes with empty range inputs */
    protected override _onSubmit(
        event: Event,
        options?: OnSubmitFormOptions | undefined,
    ): Promise<Record<string, unknown> | false> {
        for (const input of htmlQueryAll<HTMLInputElement>(this.element[0], "input[type=number]")) {
            const checkbox = htmlQuery<HTMLInputElement>(htmlClosest(input, "tr"), "input[type=checkbox]");
            if (checkbox && !Number(input.value)) {
                checkbox.checked = false;
            }
        }

        return super._onSubmit(event, options);
    }

    protected override async _updateObject(event: Event, formData: SenseFormData): Promise<void> {
        const update = Object.entries(formData)
            .filter(
                (e): e is [string, [true, string, string | null] | true] =>
                    e[1] === true || (Array.isArray(e[1]) && e[1][0]),
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

        return super._updateObject(event, { [this.objectProperty]: update });
    }
}

interface SenseSelectorData<TActor extends ActorPF2e> extends TagSelectorData<TActor> {
    hasExceptions: boolean;
    choices: Record<string, SenseChoiceData>;
    senseAcuity: Record<string, string>;
}

interface SenseChoiceData {
    selected: boolean;
    disabled: boolean;
    acuity: string;
    mandatoryAcuity: boolean;
    label: string;
    value: string;
}

type SenseFormData = Record<string, [boolean, string, string | null] | boolean>;

export { SenseSelector };
