import { DataUnionField, PredicateField, StrictBooleanField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

/** Substitute a pre-determined result for a check's D20 roll */
class SubstituteRollRuleElement extends RuleElement<SubstituteRollSchema> {
    constructor(source: RuleElementSource, options: RuleElementOptions) {
        super(source, options);

        if (this.removeAfterRoll && !this.item.isOfType("effect")) {
            this.failValidation("removeAfterRoll: may only be used with effects");
        }
    }

    static override defineSchema(): SubstituteRollSchema {
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
                    new fields.StringField<"if-enabled">({
                        required: false,
                        nullable: false,
                        choices: ["if-enabled"],
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
        const value = Math.clamp(Math.trunc(Number(this.resolveValue(this.value))), 1, 20);
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

    override async afterRoll(params: RuleElement.AfterRollParams): Promise<void> {
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
    extends RuleElement<SubstituteRollSchema>,
        ModelPropsFromRESchema<SubstituteRollSchema> {}

type SubstituteRollSchema = RuleElementSchema & {
    selector: fields.StringField<string, string, true, false, true>;
    value: ResolvableValueField<true, false, false>;
    required: fields.BooleanField<boolean, boolean, false, false, true>;
    effectType: fields.StringField<"fortune" | "misfortune", "fortune" | "misfortune", true, false, true>;
    /**
     * Remove the parent item (must be an effect) after a roll:
     * The value may be a boolean, "if-enabled", or a predicate to be tested against the roll options from the roll.
     */
    removeAfterRoll: DataUnionField<
        fields.StringField<"if-enabled"> | StrictBooleanField<false> | PredicateField<false, false, false>,
        false,
        false,
        true
    >;
};

export { SubstituteRollRuleElement };
