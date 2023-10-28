import { DataUnionField, PredicateField, StrictBooleanField, StrictStringField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import {
    ResolvableValueField,
    RuleElementOptions,
    RuleElementPF2e,
    RuleElementSchema,
    RuleElementSource,
} from "./index.ts";

/** Substitute a pre-determined result for a check's D20 roll */
class SubstituteRollRuleElement extends RuleElementPF2e<SubstituteRollSchema> {
    constructor(source: RuleElementSource, options: RuleElementOptions) {
        super(source, options);

        if (this.removeAfterRoll && !this.item.isOfType("effect")) {
            this.failValidation("  removeAfterRoll: may only be used with effects");
        }
    }

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
            removeAfterRoll: new DataUnionField(
                [
                    new StrictStringField<"if-enabled", "if-enabled">({
                        required: false,
                        nullable: false,
                        choices: ["if-enabled"],
                        initial: undefined,
                    }),
                    new StrictBooleanField({
                        required: false,
                        nullable: false,
                        initial: undefined,
                    }),
                    new PredicateField({ required: false, nullable: false, initial: undefined }),
                ],
                { required: false, nullable: false, initial: false },
            ),
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
            predicate: this.predicate,
            required: this.required,
            selected: this.required,
            effectType: this.effectType,
        });
    }

    override async afterRoll(params: RuleElementPF2e.AfterRollParams): Promise<void> {
        if (!this.removeAfterRoll || this.ignored) return;

        if (this.removeAfterRoll === true) {
            await this.item.delete();
            return;
        }

        if (Array.isArray(this.removeAfterRoll) && this.removeAfterRoll.test(params.rollOptions)) {
            await this.item.delete();
            return;
        }

        const rollSubstituted = params.roll.dice.length === 0;
        const substitutionIncluded = !!params.context.substitutions?.some((s) => s.slug === this.slug && s.selected);
        if (this.removeAfterRoll === "if-enabled" && rollSubstituted && substitutionIncluded) {
            await this.item.delete();
        }
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
    /**
     * Remove the parent item (must be an effect) after a roll:
     * The value may be a boolean, "if-enabled", or a predicate to be tested against the roll options from the roll.
     */
    removeAfterRoll: DataUnionField<
        StrictStringField<"if-enabled"> | StrictBooleanField | PredicateField<false, false, false>,
        false,
        false,
        true
    >;
};

export { SubstituteRollRuleElement };
