import type { ActorPF2e } from "@actor";
import { SENSES_WITH_MANDATORY_ACUITIES } from "@actor/creature/values.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, objectHasKey } from "@util";
import { BaseTagSelector, TagSelectorData, TagSelectorOptions } from "./base.ts";
import { SelectableTagField } from "./index.ts";

class SenseSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.traits.senses";

    static override get defaultOptions(): TagSelectorOptions {
        return fu.mergeObject(super.defaultOptions, {
            height: "auto",
            template: "systems/pf2e/templates/system/tag-selector/senses.hbs",
            id: "sense-selector",
            title: "PF2E.Actor.Creature.Sense.Plural",
            width: 350,
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
            const canSetAcuity = !objectHasKey(SENSES_WITH_MANDATORY_ACUITIES, type);
            const canSetRange = !["darkvision", "greaterDarkvision", "lowLightVision"].includes(type);
            const acuity = canSetAcuity ? sense?.acuity ?? "imprecise" : SENSES_WITH_MANDATORY_ACUITIES[type];
            return {
                ...accum,
                [type]: {
                    acuity,
                    canSetAcuity,
                    canSetRange,
                    label,
                    selected: !!sense,
                    source: sense?.source ?? null,
                    value: sense?.value ?? "",
                },
            };
        }, {});

        return {
            ...(await super.getData(options)),
            hasExceptions: false,
            choices,
            senseAcuities: CONFIG.PF2E.senseAcuities,
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
    senseAcuities: typeof CONFIG.PF2E.senseAcuities;
}

interface SenseChoiceData {
    selected: boolean;
    acuity: string;
    label: string;
    value: string;
    canSetAcuity: boolean;
    canSetRange: boolean;
    source: string | null;
}

type SenseFormData = Record<string, [boolean, string, string | null] | boolean>;

export { SenseSelector };
