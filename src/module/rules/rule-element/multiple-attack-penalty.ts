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
            selector: new fields.StringField({ required: true, blank: false }),
            value: new ResolvableValueField({ required: true, initial: undefined }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const value = Number(this.resolveValue(this.value)) || 0;
        if (selector && value) {
            const map: MAPSynthetic = { label: this.label, penalty: value, predicate: this.predicate };
            const penalties = (this.actor.synthetics.multipleAttackPenalties[selector] ??= []);
            penalties.push(map);
        } else {
            this.failValidation(
                "Multiple attack penalty requires at least a selector field and a non-empty value field"
            );
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
