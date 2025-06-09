import { MAPSynthetic } from "../synthetics.ts";
import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * @category RuleElement
 */
class MultipleAttackPenaltyRuleElement extends RuleElementPF2e<MAPRuleSchema> {
    static override LOCALIZATION_PREFIXES = ["PF2E.RuleEditor.RuleElement"];

    static override defineSchema(): MAPRuleSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({
                required: true,
                blank: false,
            }),
            value: new ResolvableValueField({
                required: true,
                initial: undefined,
            }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        if (this.ignored || selector.length === 0) return;

        const value = Number(this.resolveValue(this.value)) || 0;
        if (value < 0) {
            const label = game.i18n.format("PF2E.UI.RuleElements.MultipleAttackPenalty.Breakdown", {
                label: this.label,
            });
            const map: MAPSynthetic = { label, penalty: value, predicate: this.predicate };
            const penalties = (this.actor.synthetics.multipleAttackPenalties[selector] ??= []);
            penalties.push(map);
        } else if (value !== 0) {
            this.failValidation("value: must resolve to less than or equal to zero");
        }
    }
}

interface MultipleAttackPenaltyRuleElement
    extends RuleElementPF2e<MAPRuleSchema>,
        ModelPropsFromRESchema<MAPRuleSchema> {}

type MAPRuleSchema = RuleElementSchema & {
    selector: fields.StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, false>;
};

export { MultipleAttackPenaltyRuleElement };
