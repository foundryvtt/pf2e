import type { ActorPF2e } from "@actor";
import type { SenseAcuity, SenseType } from "@actor/creature/types.ts";
import {
    SENSES_WITH_MANDATORY_ACUITIES,
    SENSES_WITH_UNLIMITED_RANGE,
    SENSE_ACUITIES,
    SENSE_TYPES,
} from "@actor/creature/values.ts";
import type { OnSubmitFormOptions } from "@client/appv1/api/form-application-v1.d.mts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import { BaseTagSelector, TagSelectorData, TagSelectorOptions } from "./base.ts";
import type { SelectableTagField } from "./index.ts";

class SenseSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.perception.senses";

    static override get defaultOptions(): TagSelectorOptions {
        return {
            ...super.defaultOptions,
            height: "auto",
            template: `${SYSTEM_ROOT}/templates/system/tag-selector/senses.hbs`,
            id: "sense-selector",
            title: "PF2E.Actor.Creature.Sense.Plural",
        };
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["senses"] as const;
    }

    override async getData(options?: Partial<TagSelectorOptions>): Promise<SenseSelectorData<TActor>> {
        const actor = this.document;
        if (!actor.isOfType("npc")) {
            throw ErrorPF2e("The Sense selector is usable only with NPCs");
        }

        const senses = actor.system.perception.senses;
        const choices = R.mapValues(this.choices, (label, type): SenseChoiceData => {
            const sense = senses.find((s) => s.type === type);
            const canSetAcuity = !(sense?.source || SENSES_WITH_MANDATORY_ACUITIES[type]);
            const canSetRange = !(sense?.source || tupleHasValue(SENSES_WITH_UNLIMITED_RANGE, type));
            const acuity = SENSES_WITH_MANDATORY_ACUITIES[type] ?? sense?.acuity ?? "imprecise";
            return {
                acuity,
                canSetAcuity,
                canSetRange,
                label,
                selected: !!sense,
                source: sense?.source ?? null,
                range: sense?.range ?? null,
            };
        });

        return {
            ...(await super.getData(options)),
            hasExceptions: false,
            choices,
            senseAcuities: CONFIG.PF2E.senseAcuities,
            vision: {
                value: actor.system.perception.vision,
                editable: actor._source.system.perception.vision === actor.system.perception.vision,
                source: actor.system.autoChanges["system.perception.vision"]?.at(-1)?.source ?? null,
            },
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
        for (const input of htmlQueryAll<HTMLInputElement>(this.element[0], "input[type=number]:not(:disabled)")) {
            const checkbox = htmlQuery<HTMLInputElement>(htmlClosest(input, "tr"), "input[type=checkbox]");
            if (checkbox && !Number(input.value)) {
                checkbox.checked = false;
            }
        }

        return super._onSubmit(event, options);
    }

    protected override async _updateObject(event: Event, formData: SenseFormData): Promise<void> {
        const hasVision = formData["system.perception.vision"];
        const update = Object.entries(formData)
            .filter(
                (e): e is [SenseType, [true, SenseAcuity, number | null]] =>
                    setHasElement(SENSE_TYPES, e[0]) &&
                    Array.isArray(e[1]) &&
                    e[1][0] === true &&
                    tupleHasValue(SENSE_ACUITIES, e[1][1]),
            )
            .flatMap(([type, values]) => {
                const acuity = values[1];
                const range = Math.ceil(Math.max(0, Math.floor(Number(values[2] ?? NaN))) / 5) * 5;
                if (tupleHasValue(SENSES_WITH_UNLIMITED_RANGE, type)) {
                    return { type };
                } else if (tupleHasValue(SENSE_ACUITIES, acuity) && range >= 5) {
                    return { type, acuity, range };
                } else {
                    return [];
                }
            });

        return super._updateObject(event, {
            [this.objectProperty]: update,
            "system.perception.vision": hasVision,
        });
    }
}

interface SenseSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    choices: Record<SenseType, string>;
}

interface SenseSelectorData<TActor extends ActorPF2e> extends TagSelectorData<TActor> {
    hasExceptions: boolean;
    choices: Record<string, SenseChoiceData>;
    senseAcuities: typeof CONFIG.PF2E.senseAcuities;
    vision: { value: boolean; editable: boolean; source: string | null };
}

interface SenseChoiceData {
    selected: boolean;
    acuity: SenseAcuity;
    label: string;
    range: number | null;
    canSetAcuity: boolean;
    canSetRange: boolean;
    source: string | null;
}

type SenseFormData = { "system.perception.vision"?: boolean } & Record<string, [boolean, string, number | null]>;

export { SenseSelector };
