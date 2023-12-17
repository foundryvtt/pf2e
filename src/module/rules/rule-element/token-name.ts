import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";

/**
 * Change the name representing an actor's token
 * @category RuleElement
 */
class TokenNameRuleElement extends RuleElementPF2e<TokenNameRuleSchema> {
    static override defineSchema(): TokenNameRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true }),
        };
    }

    override afterPrepareData(): void {
        const name = this.resolveValue(this.value);
        if (typeof name !== "string") return this.failValidation("value must resolve to a string");

        if (!this.test()) return;

        this.actor.synthetics.tokenOverrides.name = name;
    }
}

interface TokenNameRuleElement
    extends RuleElementPF2e<TokenNameRuleSchema>,
        ModelPropsFromRESchema<TokenNameRuleSchema> {}

type TokenNameRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, false>;
};

export { TokenNameRuleElement };
