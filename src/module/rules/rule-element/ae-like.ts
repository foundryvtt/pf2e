import { SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values";
import { FeatPF2e, ItemPF2e } from "@item";
import { isObject, objectHasKey, tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementSource, RuleElementData, RuleElementOptions, RuleValue } from "./";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class AELikeRuleElement extends RuleElementPF2e {
    mode: AELikeChangeMode;

    path: string;

    phase: AELikeDataPrepPhase;

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

    constructor(data: AELikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        const mode = objectHasKey(AELikeRuleElement.CHANGE_MODES, data.mode) ? data.mode : null;
        data.priority ??= mode ? AELikeRuleElement.CHANGE_MODES[mode] : NaN;
        data.phase ??= "applyAEs";

        super(data, item, options);

        this.mode = mode ?? "override";
        this.path = typeof data.path === "string" ? data.path.replace(/^data\./, "system.") : "";
        this.phase = tupleHasValue(AELikeRuleElement.PHASES, data.phase) ? data.phase : "applyAEs";
    }

    protected validateData(): void {
        if (!objectHasKey(AELikeRuleElement.CHANGE_MODES, this.data.mode)) {
            return this.warn("mode");
        }

        if (Number.isNaN(this.data.priority)) {
            return this.warn("priority");
        }

        const actor = this.item.actor;
        const pathIsValid =
            typeof this.path === "string" &&
            this.path.length > 0 &&
            [this.path, this.path.replace(/\.\w+$/, ""), this.path.replace(/\.?\w+\.\w+$/, "")].some(
                (path) => typeof getProperty(actor, path) !== undefined
            );
        if (!pathIsValid) return this.warn("path");

        const valueIsValid = ["number", "string", "boolean", "object"].includes(typeof this.value);
        if (!valueIsValid) this.warn("value");
    }

    get value(): RuleValue {
        return this.data.value;
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
                objectHasKey(SKILL_EXPANDED, group) ? `system.skills.${SKILL_EXPANDED[group].shortform}` : match
        );

        // Do not proceed if injected-property resolution failed
        if (/\bundefined\b/.test(path)) return;

        const { actor } = this;
        const current: unknown = getProperty(actor, path);
        const change: unknown = this.resolveValue(this.value);
        const newValue = this.getNewValue(current, change);
        if (this.ignored) return;

        if (this.mode === "add" && Array.isArray(current) && !current.includes(newValue)) {
            current.push(newValue);
        } else if (["subtract", "remove"].includes(this.mode) && Array.isArray(current)) {
            current.splice(current.indexOf(newValue));
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
        this.failValidation(`"${property}" property is missing or invalid`);
    }
}

interface AutoChangeEntry {
    source: string;
    level: number | null;
    value: number | string;
    mode: AELikeChangeMode;
}

interface AELikeRuleElement extends RuleElementPF2e {
    data: AELikeData;
}

type AELikeChangeMode = "add" | "subtract" | "remove" | "multiply" | "upgrade" | "downgrade" | "override";
type AELikeDataPrepPhase = "applyAEs" | "beforeDerived" | "afterDerived" | "beforeRoll";

interface AELikeData extends RuleElementData {
    path: string;
    value: RuleValue;
    mode: AELikeChangeMode;
    priority: number;
    phase: AELikeDataPrepPhase;
}

interface AELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

export { AELikeData, AELikeRuleElement, AELikeSource, AutoChangeEntry };
