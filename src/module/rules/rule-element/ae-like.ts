import * as R from "remeda";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;
import validation = foundry.data.validation;

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class AELikeRuleElement<TSchema extends AELikeSchema> extends RuleElement<TSchema> {
    static override defineSchema(): AELikeSchema {
        const baseSchema = super.defineSchema();
        const PRIORITIES: Record<string, number | undefined> = this.CHANGE_MODE_DEFAULT_PRIORITIES;
        baseSchema.priority.initial = (d) => PRIORITIES[String(d.mode)] ?? 50;

        return {
            ...baseSchema,
            testDomains: new fields.ArrayField(
                new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
                { required: false, nullable: false, initial: () => [] },
            ),
            mode: new fields.StringField({
                required: true,
                choices: R.keys(this.CHANGE_MODE_DEFAULT_PRIORITIES),
                initial: undefined,
            }),
            path: new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            phase: new fields.StringField({
                required: false,
                nullable: false,
                choices: fu.deepClone(this.PHASES),
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

    static override validateJoint(data: fields.SourceFromSchema<AELikeSchema>): void {
        super.validateJoint(data);

        if (data.merge) {
            if (data.mode !== "override") {
                throw new foundry.data.validation.DataModelValidationError('mode must be "override" if merge is true');
            }
            if (!R.isPlainObject(data.value)) {
                throw new foundry.data.validation.DataModelValidationError("value must be an object if merge is true");
            }
        }
    }

    #pathIsValid(path: string): boolean {
        const actor = this.item.actor;
        return (
            !path.startsWith("data.") &&
            !/\bnull\b/.test(path) &&
            (path.startsWith("flags.") ||
                [path, path.replace(/\.[-\w]+$/, ""), path.replace(/\.?[-\w]+\.[-\w]+$/, "")].some(
                    (path) => fu.getProperty(actor, path) !== undefined,
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
        const path = this.resolveInjectedProperties(this.path);
        if (this.ignored) return;
        if (!this.#pathIsValid(path)) {
            return this.failValidation(`no data found at or near "${path}"`);
        }

        rollOptions ??= this.predicate.length > 0 ? new Set(this.actor.getRollOptions(this.testDomains)) : new Set();
        if (!this.test(rollOptions)) return;

        const actor = this.actor;
        const current = fu.getProperty(actor, path);
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
                fu.setProperty(actor, path, newValue);
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

    static getNewValue(mode: AELikeChangeMode, current: number, change: number, merge?: boolean): number;
    static getNewValue<TCurrent>(
        mode: AELikeChangeMode,
        current: TCurrent,
        change: TCurrent extends (infer TValue)[] ? TValue : TCurrent,
        merge?: boolean,
    ): (TCurrent extends (infer TValue)[] ? TValue : TCurrent) | validation.DataModelValidationFailure;
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
                const isOverridable =
                    R.isNullish(current) ||
                    typeof current === typeof change ||
                    // Allow numbers and booleans to override each other to allow for cases of overridable union types
                    (["number", "boolean"].includes(typeof current) && ["number", "boolean"].includes(typeof change));
                if (merge && R.isObjectType(current) && R.isObjectType(change)) {
                    return fu.mergeObject(current, change);
                } else if (!isOverridable) {
                    return new DataModelValidationFailure({
                        invalidValue: change,
                        message: `${change} cannot override ${current}`,
                        fallback: false,
                    });
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
            typeof value === "boolean" || typeof value === "number" || typeof value === "string" || value === null;
        if (!isLoggable) return;

        const level = item.isOfType("feat")
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
    extends RuleElement<TSchema>,
        ModelPropsFromRESchema<AELikeSchema> {}

interface AutoChangeEntry {
    source: string;
    level: number | null;
    value: boolean | number | string | null;
    mode: AELikeChangeMode;
}

type AELikeSchema = RuleElementSchema & {
    /** How to apply the `value` at the `path` */
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    /** The data property path to modify on the parent item's actor */
    path: fields.StringField<string, string, true, false, false>;
    /** Which phase of data preparation to run in */
    phase: fields.StringField<AELikeDataPrepPhase, AELikeDataPrepPhase, false, false, true>;
    /** The value to applied at the `path` */
    value: ResolvableValueField<true, boolean, boolean>;
    /** A list of additional domains to include in predicate testing */
    testDomains: fields.ArrayField<
        fields.StringField<string, string, true, false, false>,
        string[],
        string[],
        false,
        false,
        true
    >;
    /** Whether to merge two objects given a `mode` of "override" */
    merge: fields.BooleanField<boolean, boolean, false, false, false>;
};

type AELikeChangeMode = keyof typeof AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES;
type AELikeDataPrepPhase = (typeof AELikeRuleElement.PHASES)[number];

interface AELikeSource extends RuleElementSource {
    mode?: JSONValue;
    path?: JSONValue;
    phase?: JSONValue;
    value?: JSONValue;
}

export { AELikeRuleElement };
export type { AELikeChangeMode, AELikeDataPrepPhase, AELikeSchema, AELikeSource, AutoChangeEntry };
