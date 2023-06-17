import { sluggify, tupleHasValue } from "@util";
import { RuleElementOptions, RuleElementPF2e } from "./base.ts";
import { RuleElementSource } from "./index.ts";

/** Substitute a pre-determined result for a check's D20 roll */
class SubstituteRollRuleElement extends RuleElementPF2e {
    selector = "check";

    /** Whether this substitution is required for matching rolls */
    required = false;

    /** The effect type of this substitution */
    effectType: "fortune" | "misfortune";

    constructor(data: SubstituteRollSource, options: RuleElementOptions) {
        data.slug ??= options.parent.slug ?? sluggify(options.parent.name);

        super(data, options);

        if (this.#isValid(data)) {
            this.selector = data.selector;
            this.required = data.required ?? false;
        }

        this.effectType = tupleHasValue(["fortune", "misfortune"] as const, data.effectType)
            ? data.effectType
            : "fortune";
    }

    #isValid(data: SubstituteRollSource): data is SubstituteRollData {
        return typeof data.selector === "string" && (!("required" in data) || typeof data.required === "boolean");
    }

    override beforePrepareData(): void {
        const value = Math.clamped(Math.trunc(Number(this.resolveValue())), 1, 20);
        if (Number.isNaN(value)) {
            this.ignored = true;
            return;
        }

        const selector = this.resolveInjectedProperties(this.selector);

        (this.actor.synthetics.rollSubstitutions[selector] ??= []).push({
            slug: this.slug,
            label: this.label,
            value,
            predicate: this.predicate ?? null,
            ignored: this.required ? false : true,
            effectType: this.effectType,
        });
    }
}

interface SubstituteRollRuleElement extends RuleElementPF2e {
    slug: string;
}

interface SubstituteRollSource extends RuleElementSource {
    selector?: unknown;
    required?: unknown;
    effectType?: unknown;
}

interface SubstituteRollData {
    key: "SubstituteRoll";
    selector: string;
    required?: boolean;
}

export { SubstituteRollRuleElement };
