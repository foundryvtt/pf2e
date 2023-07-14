import { SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values.ts";
import { FeatPF2e } from "@item";
import { objectHasKey } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class AELikeRuleElement<TSchema extends AELikeSchema> extends RuleElementPF2e<TSchema> {
    constructor(source: AELikeSource, options: RuleElementOptions) {
        if (objectHasKey(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES, source.mode)) {
            source.priority ??= AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES[source.mode];
        }
        super(source, options);
    }

    static override defineSchema(): AELikeSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            mode: new fields.StringField({
                required: true,
                choices: this.CHANGE_MODES,
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
        };
    }

    static CHANGE_MODES = ["multiply", "add", "subtract", "remove", "downgrade", "upgrade", "override"] as const;

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
    static SKILL_LONG_FORM_PATH = ((): RegExp => {
        const skillLongForms = Array.from(SKILL_LONG_FORMS).join("|");
        return new RegExp(String.raw`^system\.skills\.(${skillLongForms})\b`);
    })();

    protected validateData(): void {
        const actor = this.item.actor;
        const pathIsValid =
            typeof this.path === "string" &&
            this.path.length > 0 &&
            [this.path, this.path.replace(/\.\w+$/, ""), this.path.replace(/\.?\w+\.\w+$/, "")].some(
                (path) => typeof getProperty(actor, path) !== undefined
            );
        if (!pathIsValid) return this.warn("path");
    }

    /** Apply the modifications immediately after proper ActiveEffects are applied */
    override onApplyActiveEffects(): void {
        if (!this.ignored && this.phase === "applyAEs") this.applyAELike();
    }

    /** Apply the modifications near the beginning of the actor's derived-data preparation */
    override beforePrepareData(): void {
        if (!this.ignored && this.phase === "beforeDerived") this.applyAELike();
    }

    /** Apply the modifications at the conclusion of the actor's derived-data preparation */
    override afterPrepareData(): void {
        if (!this.ignored && this.phase === "afterDerived") this.applyAELike();
    }

    /** Apply the modifications prior to a Check (roll) */
    override beforeRoll(_domains: string[], rollOptions: Set<string>): void {
        if (!this.ignored && this.phase === "beforeRoll") this.applyAELike(rollOptions);
    }

    protected applyAELike(rollOptions = new Set(this.actor.getRollOptions())): void {
        this.validateData();
        if (!this.test(rollOptions)) return;

        // Convert long-form skill slugs in paths to short forms
        const path = this.resolveInjectedProperties(this.path).replace(
            AELikeRuleElement.SKILL_LONG_FORM_PATH,
            (match, group) =>
                objectHasKey(SKILL_EXPANDED, group) ? `system.skills.${SKILL_EXPANDED[group].shortForm}` : match
        );

        // Do not proceed if injected-property resolution failed
        if (/\bundefined\b/.test(path)) return;

        const { actor } = this;
        const current: unknown = getProperty(actor, path);
        const change: unknown = this.resolveValue(this.value);
        const newValue = AELikeRuleElement.getNewValue(this.mode, current, change);
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
                console.warn(error);
            }
        }
    }

    static getNewValue<TCurrent>(
        mode: AELikeChangeMode,
        current: TCurrent,
        change: TCurrent extends (infer TValue)[] ? TValue : TCurrent
    ): TCurrent | DataModelValidationFailure;
    static getNewValue(mode: AELikeChangeMode, current: unknown, change: unknown): unknown {
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

    protected warn(property: string): void {
        this.failValidation(`"${property}" property is invalid`);
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
    mode: StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    path: StringField<string, string, true, false, false>;
    phase: StringField<AELikeDataPrepPhase, AELikeDataPrepPhase, false, false, true>;
    value: ResolvableValueField<true, boolean, boolean>;
};

type AELikeChangeMode = (typeof AELikeRuleElement.CHANGE_MODES)[number];
type AELikeDataPrepPhase = (typeof AELikeRuleElement.PHASES)[number];

interface AELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

export { AELikeChangeMode, AELikeRuleElement, AELikeSchema, AELikeSource, AutoChangeEntry };
