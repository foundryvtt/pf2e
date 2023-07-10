import { sluggify } from "@util";
import { RuleElementPF2e } from "./base.ts";
import { RuleElementSchema } from "./index.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

/** Substitute a pre-determined result for a check's D20 roll */
class SubstituteRollRuleElement extends RuleElementPF2e<SubstituteRollSchema> {
    static override defineSchema(): SubstituteRollSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false, initial: "check" }),
            value: new ResolvableValueField({ required: true, nullable: false }),
            required: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            effectType: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["fortune", "misfortune"],
                initial: "fortune",
            }),
        };
    }

    override beforePrepareData(): void {
        const value = Math.clamped(Math.trunc(Number(this.resolveValue(this.value))), 1, 20);
        if (Number.isNaN(value)) {
            return this.failValidation("value must resolve to a number");
        }
        const selector = this.resolveInjectedProperties(this.selector);

        (this.actor.synthetics.rollSubstitutions[selector] ??= []).push({
            slug: this.slug ?? sluggify(this.item.name),
            label: this.label,
            value,
            predicate: this.predicate ?? null,
            ignored: !this.required,
            effectType: this.effectType,
        });
    }
}

interface SubstituteRollRuleElement
    extends RuleElementPF2e<SubstituteRollSchema>,
        ModelPropsFromSchema<SubstituteRollSchema> {}

type SubstituteRollSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, true>;
    value: ResolvableValueField<true, false, false>;
    required: BooleanField<boolean, boolean, false, false, true>;
    effectType: StringField<"fortune" | "misfortune", "fortune" | "misfortune", true, false, true>;
};

export { SubstituteRollRuleElement };
