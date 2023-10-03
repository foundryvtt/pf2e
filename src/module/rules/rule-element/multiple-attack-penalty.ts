import { MAPSynthetic } from "../synthetics.ts";
import { ResolvableValueField, RuleElementSchema } from "./data.ts";
import { RuleElementPF2e } from "./index.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";

/**
 * @category RuleElement
 */
class MultipleAttackPenaltyRuleElement extends RuleElementPF2e<MAPRuleSchema> {
    static override defineSchema(): MAPRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({
                required: true,
                blank: false,
                label: "PF2E.RuleEditor.General.Selector",
            }),
            value: new ResolvableValueField({
                required: true,
                initial: undefined,
                label: "PF2E.RuleEditor.General.Value",
            }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const value = Number(this.resolveValue(this.value)) || 0;
        if (selector && value && value < 0) {
            const label = game.i18n.format("PF2E.UI.RuleElements.MultipleAttackPenalty.Breakdown", {
                label: this.label,
            });
            const map: MAPSynthetic = { label, penalty: value, predicate: this.predicate };
            const penalties = (this.actor.synthetics.multipleAttackPenalties[selector] ??= []);
            penalties.push(map);
        } else {
            this.failValidation("must have a negative value");
        }
    }
}

interface MultipleAttackPenaltyRuleElement
    extends RuleElementPF2e<MAPRuleSchema>,
        ModelPropsFromSchema<MAPRuleSchema> {}

type MAPRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, false>;
};

export { MultipleAttackPenaltyRuleElement };
