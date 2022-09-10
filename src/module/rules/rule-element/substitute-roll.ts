import { ItemPF2e } from "@item";
import { sluggify, tupleHasValue } from "@util";
import { RuleElementSource } from ".";
import { RuleElementOptions, RuleElementPF2e } from "./base";

/** Substitute a pre-determined result for a check's D20 roll */
class SubstituteRollRuleElement extends RuleElementPF2e {
    selector = "check";

    /** Whether this substitution is required for matching rolls */
    required = false;

    /** The effect type of this substitution */
    effectType: "fortune" | "misfortune";

    constructor(data: SubstituteRollSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        data.required ??= false;
        if (this.#isValid(data)) {
            this.selector = data.selector;
            this.required = data.required;
        }

        this.slug = typeof data.slug === "string" ? data.slug : sluggify(this.item.name);

        this.effectType = tupleHasValue(["fortune", "misfortune"] as const, data.effectType)
            ? data.effectType
            : "fortune";
    }

    #isValid(data: SubstituteRollSource): data is SubstituteRollData {
        return typeof data.selector === "string" && typeof data.required === "boolean";
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
    required: boolean;
}

export { SubstituteRollRuleElement };
