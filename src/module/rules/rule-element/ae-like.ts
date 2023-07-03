import { SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values.ts";
import { FeatPF2e } from "@item";
import { isObject, objectHasKey } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class AELikeRuleElement<TSchema extends AELikeSchema> extends RuleElementPF2e<TSchema> {
    constructor(data: AELikeSource, options: RuleElementOptions) {
        const hasExplicitPriority = typeof data.priority === "number";
        super(data, options);

        // Set priority according to AE change mode if no priority was explicitly set
        if (!hasExplicitPriority) {
            this.priority = AELikeRuleElement.CHANGE_MODES[this.mode];
        }
    }

    static override defineSchema(): AELikeSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            mode: new fields.StringField({
                required: true,
                choices: Object.keys(this.CHANGE_MODES) as AELikeChangeMode[],
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

    /** Change modes and their default priority orders */
    static CHANGE_MODES = {
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
        const newValue = this.getNewValue(current, change);
        if (this.ignored) return;

        if (this.mode === "add" && Array.isArray(current)) {
            if (!current.includes(newValue)) {
                current.push(newValue);
            }
        } else if (["subtract", "remove"].includes(this.mode) && Array.isArray(current)) {
            current.splice(current.indexOf(newValue), 1);
        } else {
            try {
                setProperty(actor, path, newValue);
                this.logChange(change);
            } catch (error) {
                console.warn(error);
            }
        }
    }

    protected getNewValue(current: number | undefined, change: number): number;
    protected getNewValue(current: string | number | undefined, change: string | number): string | number;
    protected getNewValue(current: unknown, change: unknown): unknown;
    protected getNewValue(current: unknown, change: unknown): unknown {
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

            this.warn("path");
            return null;
        };

        switch (this.mode) {
            case "multiply": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    this.warn("path");
                    return null;
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
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    this.warn("path");
                    return null;
                }
                return Math.min(current ?? 0, change);
            }
            case "upgrade": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    return this.warn("path");
                }
                return Math.max(current ?? 0, change);
            }
            case "override": {
                // Resolve all values if the override is an object
                if (isObject<Record<string, unknown>>(change)) {
                    for (const [key, value] of Object.entries(change)) {
                        if (typeof value === "string") change[key] = this.resolveInjectedProperties(value);
                    }
                }
                return change;
            }
            default:
                return null;
        }
    }

    /** Log the numeric change of an actor data property */
    private logChange(value: unknown): void {
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

type AELikeChangeMode = keyof (typeof AELikeRuleElement)["CHANGE_MODES"];
type AELikeDataPrepPhase = (typeof AELikeRuleElement)["PHASES"][number];

interface AELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

export { AELikeChangeMode, AELikeRuleElement, AELikeSchema, AELikeSource, AutoChangeEntry };
