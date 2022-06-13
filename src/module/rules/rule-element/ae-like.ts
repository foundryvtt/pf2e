import { SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/data/values";
import { FeatPF2e, ItemPF2e } from "@item";
import { isObject, objectHasKey } from "@util";
import { RuleElementPF2e, RuleElementSource, RuleElementData, RuleElementOptions, RuleValue } from "./";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class AELikeRuleElement extends RuleElementPF2e {
    static CHANGE_MODES = ["multiply", "add", "downgrade", "upgrade", "override"];

    /**
     * Pattern to match data.skills.${longForm} paths for replacement
     * Temporary solution until skill data is represented in long form
     */
    static SKILL_LONG_FORM_PATH = ((): RegExp => {
        const skillLongForms = Array.from(SKILL_LONG_FORMS).join("|");
        return new RegExp(String.raw`(?<=^data\.skills\.)(?:${skillLongForms})\b`);
    })();

    constructor(data: AELikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data = deepClone(data);
        data.priority ??=
            typeof data.mode === "string" && AELikeRuleElement.CHANGE_MODES.includes(data.mode)
                ? AELikeRuleElement.CHANGE_MODES.indexOf(data.mode) * 10 + 10
                : NaN;
        data.phase ??= "applyAEs";

        super(data, item, options);
    }

    protected validateData(): void {
        if (Number.isNaN(this.priority)) {
            return this.warn("priority");
        }

        if (!AELikeRuleElement.CHANGE_MODES.includes(this.data.mode)) {
            return this.warn("mode");
        }

        const actor = this.item.actor;
        const pathIsValid =
            typeof this.path === "string" &&
            [this.path, this.path.replace(/\.\w+$/, ""), this.path.replace(/\.?\w+\.\w+$/, "")].some(
                (path) => typeof getProperty(actor.data, path) !== undefined
            );
        if (!pathIsValid) return this.warn("path");

        const valueIsValid = ["number", "string", "boolean", "object"].includes(typeof this.value);
        if (!valueIsValid) this.warn("value");
    }

    get path(): string {
        return this.data.path;
    }

    get mode(): AELikeChangeMode {
        return this.data.mode;
    }

    get value(): RuleValue {
        return this.data.value;
    }

    /** Apply the modifications immediately after proper ActiveEffects are applied */
    override onApplyActiveEffects(): void {
        if (!this.ignored && this.data.phase === "applyAEs") this.applyAELike();
    }

    /** Apply the modifications near the beginning of the actor's derived-data preparation */
    override beforePrepareData(): void {
        if (!this.ignored && this.data.phase === "beforeDerived") this.applyAELike();
    }

    /** Apply the modifications at the conclusion of the actor's derived-data preparation */
    override afterPrepareData(): void {
        if (!this.ignored && this.data.phase === "afterDerived") this.applyAELike();
    }

    /** Apply the modifications prior to a Check (roll) */
    override beforeRoll(_domains: string[], rollOptions: string[]): void {
        if (!this.ignored && this.data.phase === "beforeRoll") this.applyAELike(rollOptions);
    }

    protected applyAELike(rollOptions = this.actor.getRollOptions()): void {
        this.validateData();
        if (!this.test(rollOptions)) return;

        // Convert long-form skill slugs in paths to short forms
        this.data.path = this.resolveInjectedProperties(this.data.path).replace(
            AELikeRuleElement.SKILL_LONG_FORM_PATH,
            (match) => (objectHasKey(SKILL_EXPANDED, match) ? SKILL_EXPANDED[match].shortform : match)
        );

        // Do not proceed if injected-property resolution failed
        if (/\bundefined\b/.test(this.path)) return;

        const current: unknown = getProperty(this.actor.data, this.path);
        const change: unknown = this.resolveValue(this.data.value);
        const newValue = this.getNewValue(current, change);
        if (this.ignored) return;

        if (this.mode === "add" && Array.isArray(current)) {
            current.push(newValue);
        } else {
            setProperty(this.actor.data, this.path, newValue);
            this.logChange(change);
        }
    }

    protected getNewValue(current: number | undefined, change: number): number;
    protected getNewValue(current: string | number | undefined, change: string | number): string | number;
    protected getNewValue(current: unknown, change: unknown): unknown;
    protected getNewValue(current: unknown, change: unknown): unknown {
        switch (this.mode) {
            case "multiply": {
                if (!(typeof change === "number" && (typeof current === "number" || current === undefined))) {
                    this.warn("path");
                    return null;
                }
                return Math.trunc((current ?? 0) * change);
            }
            case "add": {
                // A numeric add is valid if the change value is a number and the current value is a number or nullish
                const isNumericAdd =
                    typeof change === "number" &&
                    (typeof current === "number" || current === undefined || current === null);
                // An array add is valid if the current value is an array and either empty or consisting of all elements
                // of the same type as the change value
                const isArrayAdd = Array.isArray(current) && current.every((e) => typeof e === typeof change);

                if (isNumericAdd) {
                    return (current ?? 0) + change;
                } else if (isArrayAdd) {
                    return change;
                }

                this.warn("path");
                return null;
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
                ? Number(/-(\d+)$/.exec(item.data.data.location ?? "")?.[1]) || item.level
                : "level" in item && typeof item["level"] === "number"
                ? item["level"]
                : null;
        const { autoChanges } = this.actor.data.data;
        const entries = (autoChanges[this.path] ??= []);
        entries.push({ mode, level, value, source: this.item.name });
    }

    protected warn(property: string): void {
        this.failValidation(`"${property}" property is missing or invalid`);
    }
}

export interface AutoChangeEntry {
    source: string;
    level: number | null;
    value: number | string;
    mode: AELikeChangeMode;
}

interface AELikeRuleElement extends RuleElementPF2e {
    data: AELikeData;
}

type AELikeChangeMode = "add" | "multiply" | "upgrade" | "downgrade" | "override";

export interface AELikeData extends RuleElementData {
    path: string;
    value: RuleValue;
    mode: AELikeChangeMode;
    priority: number;
    phase: "applyAEs" | "beforeDerived" | "afterDerived" | "beforeRoll";
}

export interface AELikeSource extends RuleElementSource {
    mode?: unknown;
    path?: unknown;
    phase?: unknown;
}

export { AELikeRuleElement };
