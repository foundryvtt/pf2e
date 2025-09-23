import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Change the name representing an actor's token
 * @category RuleElement
 */
class TokenNameRuleElement extends RuleElement<TokenNameRuleSchema> {
    static override defineSchema(): TokenNameRuleSchema {
        return {
            ...super.defineSchema(),
            value: new fields.StringField({ required: true, nullable: false, blank: false }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;
        this.actor.synthetics.tokenOverrides.name = this.resolveInjectedProperties(this.value);
    }
}

interface TokenNameRuleElement extends RuleElement<TokenNameRuleSchema>, ModelPropsFromRESchema<TokenNameRuleSchema> {}

type TokenNameRuleSchema = RuleElementSchema & {
    value: fields.StringField<string, string, true, false, false>;
};

export { TokenNameRuleElement };
