import { SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values.ts";
import { FeatPF2e } from "@item";
import { isObject, objectHasKey } from "@util";
import * as R from "remeda";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class AELikeRuleElement<TSchema extends AELikeSchema> extends RuleElementPF2e<TSchema> {
    static override defineSchema(): AELikeSchema {
        const { fields } = foundry.data;

        const baseSchema = super.defineSchema();
        const PRIORITIES: Record<string, number | undefined> = this.CHANGE_MODE_DEFAULT_PRIORITIES;
        baseSchema.priority.initial = (d) => PRIORITIES[String(d.mode)] ?? 50;

        return {
            ...baseSchema,
            mode: new fields.StringField({
                required: true,
                choices: R.keys.strict(this.CHANGE_MODE_DEFAULT_PRIORITIES),
                initial: undefined,
            }),
            path: new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            phase: new fields.StringField({
                required: false,
                nullable: false,
                choices: deepClone(this.PHASES),
                initial: "applyAEs",
            }),
            value: new ResolvableValueField({ required: true, nullable: true, initial: undefined }),
            merge: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    static CHANGE_MODE_DEFAULT_PRIORITIES = {
        multiply: 10,
        add: 20,
        subtract: 20,
        remove: 20,
        downgrade: 30,
        upgrade: 40,
        override: 50,
    };

    static PHASES = ["applyAEs", "beforeDerived", "afterDerived", "beforeRoll"] as const;

    /**
     * Pattern to match system.skills.${longForm} paths for replacement
     * Temporary solution until skill data is represented in long form
     */
    static #SKILL_LONG_FORM_PATH = ((): RegExp => {
        const skillLongForms = Array.from(SKILL_LONG_FORMS).join("|");
        return new RegExp(String.raw`^system\.skills\.(${skillLongForms})\b`);
    })();

    static override validateJoint(data: SourceFromSchema<AELikeSchema>): void {
        super.validateJoint(data);

        if (data.merge) {
            if (data.mode !== "override") {
                throw new foundry.data.validation.DataModelValidationError('  merge: `mode` must be "override"');
            }
            if (!isObject(data.value)) {
                throw new foundry.data.validation.DataModelValidationError("  merge: `value` must an object");
            }
        }
    }

    #rewriteSkillLongFormPath(path: string): string {
        return path.replace(AELikeRuleElement.#SKILL_LONG_FORM_PATH, (match, group) =>
            objectHasKey(SKILL_EXPANDED, group) ? `system.skills.${SKILL_EXPANDED[group].shortForm}` : match,
        );
    }

    #pathIsValid(path: string): boolean {
        const actor = this.item.actor;
        return (
            path.length > 0 &&
            !/\bnull\b/.test(path) &&
            (path.startsWith("flags.") ||
                [path, path.replace(/\.[-\w]+$/, ""), path.replace(/\.?[-\w]+\.[-\w]+$/, "")].some(
                    (path) => getProperty(actor, path) !== undefined,
                ))
        );
    }

    /** Process this rule element during item pre-creation to inform subsequent choice sets. */
    override async preCreate(): Promise<void> {
        if (this.phase === "applyAEs") this.#applyAELike();
    }

    /** Apply the modifications immediately after proper ActiveEffects are applied */
    override onApplyActiveEffects(): void {
        if (this.phase === "applyAEs") this.#applyAELike();
    }

    /** Apply the modifications near the beginning of the actor's derived-data preparation */
    override beforePrepareData(): void {
        if (this.phase === "beforeDerived") this.#applyAELike();
    }

    /** Apply the modifications at the conclusion of the actor's derived-data preparation */
    override afterPrepareData(): void {
        if (this.phase === "afterDerived") this.#applyAELike();
    }

    /** Apply the modifications prior to a Check (roll) */
    override beforeRoll(_domains: string[], rollOptions: Set<string>): void {
        if (this.phase === "beforeRoll") this.#applyAELike(rollOptions);
    }

    #applyAELike(rollOptions?: Set<string>): void {
        if (this.ignored) return;
        // Convert long-form skill slugs in paths to short forms
        const path = this.#rewriteSkillLongFormPath(this.resolveInjectedProperties(this.path));
        if (this.ignored) return;
        if (!this.#pathIsValid(path)) {
            return this.failValidation(`no data found at or near "${path}"`);
        }

        rollOptions ??= this.predicate.length > 0 ? new Set(this.actor.getRollOptions()) : new Set();
        if (!this.test(rollOptions)) return;

        const { actor } = this;
        const current = getProperty(actor, path);
        const change = this.resolveValue(this.value);
        const newValue = AELikeRuleElement.getNewValue(this.mode, current, change, this.merge);
        if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
            return this.failValidation(newValue.asError().message);
        }

        if (this.mode === "add" && Array.isArray(current)) {
            if (!current.includes(newValue)) {
                current.push(newValue);
            }
        } else if (["subtract", "remove"].includes(this.mode) && Array.isArray(current)) {
            current.splice(current.indexOf(newValue), 1);
        } else {
            try {
                setProperty(actor, path, newValue);
                this.#logChange(change);
            } catch (error) {
                if (error instanceof Error) {
                    this.failValidation(error.message);
                } else {
                    console.warn(error);
                }
            }
        }
    }

    static getNewValue<TCurrent>(
        mode: AELikeChangeMode,
        current: TCurrent,
        change: TCurrent extends (infer TValue)[] ? TValue : TCurrent,
        merge?: boolean,
    ): (TCurrent extends (infer TValue)[] ? TValue : TCurrent) | DataModelValidationFailure;
    static getNewValue(mode: AELikeChangeMode, current: unknown, change: unknown, merge = false): unknown {
        const { DataModelValidationFailure } = foundry.data.validation;

        const addOrSubtract = (value: unknown): unknown => {
            // A numeric add is valid if the change value is a number and the current value is a number or nullish
            const isNumericAdd =
                typeof value === "number" && (typeof current === "number" || current === undefined || current === null);
            // An array add is valid if the current value is an array and either empty or consisting of all elements
            // of the same type as the change value
            const isArrayAdd = Array.isArray(current) && current.every((e) => typeof e === typeof value);

            if (isNumericAdd) {
                return (current ?? 0) + value;
            } else if (isArrayAdd) {
                return value;
            }

            return new DataModelValidationFailure({ invalidValue: value, fallback: false });
        };

        switch (mode) {
            case "multiply": {
                if (typeof change !== "number") {
                    return new DataModelValidationFailure({ invalidValue: change, fallback: false });
                }
                if (!(typeof current === "number" || current === undefined)) {
                    return new DataModelValidationFailure({ invalidValue: current, fallback: false });
                }
                return Math.trunc((current ?? 0) * change);
            }
            case "add": {
                return addOrSubtract(change);
            }
            case "subtract":
            case "remove": {
                const addedChange =
                    (typeof current === "number" || current === undefined) && typeof change === "number"
                        ? -1 * change
                        : change;
                return addOrSubtract(addedChange);
            }
            case "downgrade": {
                if (typeof change !== "number") {
                    return new DataModelValidationFailure({ invalidValue: change, fallback: false });
                }
                if (!(typeof current === "number" || current === undefined)) {
                    return new DataModelValidationFailure({ invalidValue: current, fallback: false });
                }
                return Math.min(current ?? 0, change);
            }
            case "upgrade": {
                if (typeof change !== "number") {
                    return new DataModelValidationFailure({ invalidValue: change, fallback: false });
                }
                if (!(typeof current === "number" || current === undefined)) {
                    return new DataModelValidationFailure({ invalidValue: current, fallback: false });
                }
                return Math.max(current ?? 0, change);
            }
            case "override": {
                if (merge && isObject(current) && isObject(change)) {
                    return mergeObject(current, change);
                }
                return change;
            }
            default:
                return null;
        }
    }

    /** Log the numeric change of an actor data property */
    #logChange(value: unknown): void {
        const { item, mode } = this;
        const isLoggable =
            !(typeof value === "number" || typeof value === "string") &&
            typeof value === "string" &&
            mode !== "override";
        if (!isLoggable) return;

        value;
        const level =
            item instanceof FeatPF2e
                ? Number(/-(\d+)$/.exec(item.system.location ?? "")?.[1]) || item.level
                : "level" in item && typeof item["level"] === "number"
                ? item["level"]
                : null;
        const { autoChanges } = this.actor.system;
        const entries = (autoChanges[this.path] ??= []);
        entries.push({ mode, level, value, source: this.item.name });
    }
}

interface AELikeRuleElement<TSchema extends AELikeSchema>
    extends RuleElementPF2e<TSchema>,
        ModelPropsFromSchema<AELikeSchema> {}

interface AutoChangeEntry {
    source: string;
    level: number | null;
    value: number | string;
    mode: AELikeChangeMode;
}

type AELikeSchema = RuleElementSchema & {
    /** How to apply the `value` at the `path` */
    mode: StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    /** The data property path to modify on the parent item's actor */
    path: StringField<string, string, true, false, false>;
    /** Which phase of data preparation to run in */
    phase: StringField<AELikeDataPrepPhase, AELikeDataPrepPhase, false, false, true>;
    /** The value to applied at the `path` */
    value: ResolvableValueField<true, boolean, boolean>;
    /** Whether to merge two objects given a `mode` of "override" */
    merge: BooleanField<boolean, boolean, false, false, false>;
};

type AELikeChangeMode = keyof typeof AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES;
type AELikeDataPrepPhase = (typeof AELikeRuleElement.PHASES)[number];

interface AELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

export { AELikeRuleElement };
export type { AELikeChangeMode, AELikeDataPrepPhase, AELikeSchema, AELikeSource, AutoChangeEntry };
