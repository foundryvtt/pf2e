import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Change the name representing an actor's token
 * @category RuleElement
 */
class TokenNameRuleElement extends RuleElement<TokenNameRuleSchema> {
    static override autogenForms = true;

    static override defineSchema(): TokenNameRuleSchema {
        return {
            ...super.defineSchema(),
            value: new fields.StringField({ required: true, nullable: false, blank: false }),
        };
    }

    override afterPrepareData(): void {
        if (!this.test()) return;
        const changes = (this.actor.tokenActiveEffectChanges.final ??= []);
        changes.push({
            type: "override",
            key: "name",
            value: this.resolveInjectedProperties(this.value),
            priority: this.priority,
            phase: "final",
        });
    }
}

interface TokenNameRuleElement extends RuleElement<TokenNameRuleSchema>, ModelPropsFromRESchema<TokenNameRuleSchema> {}

type TokenNameRuleSchema = RuleElementSchema & {
    value: fields.StringField<string, string, true, false, false>;
};

export { TokenNameRuleElement };
