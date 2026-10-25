import type { DeferredValueParams } from "@actor/modifiers.ts";
import { DamageBypassContribution, DamageBypassRuleElement, DamageBypassRuleSchema } from "./damage-bypass.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSource } from "./data.ts";

/**
 * Causes damage from the given selector(s) to ignore a target's immunity to one or more types. If a value is provided,
 * the immunity is instead treated as a resistance of that value.
 *
 * @category RuleElement
 */
class IgnoreImmunityRuleElement extends DamageBypassRuleElement<IgnoreImmunityRuleSchema> {
    static override defineSchema(): IgnoreImmunityRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: true, initial: null }),
        };
    }

    protected override createBypass(options: DeferredValueParams): DamageBypassContribution | null {
        const types = this.resolveTypes(CONFIG.PF2E.immunityTypes);
        if (!types) return null;
        if (this.value === null) return { immunity: { ignore: types } };

        const value = Math.floor(Number(this.resolveValue(this.value, 0, options)));
        if (!Number.isInteger(value) || value <= 0) {
            if (value !== 0) this.failValidation("value must resolve to a positive integer or be null");
            return null;
        }

        return { immunity: { downgrade: types.map((type) => ({ type, resistance: value })) } };
    }
}

interface IgnoreImmunityRuleElement
    extends DamageBypassRuleElement<IgnoreImmunityRuleSchema>, ModelPropsFromRESchema<IgnoreImmunityRuleSchema> {}

interface IgnoreImmunitySource extends RuleElementSource {
    selector?: JSONValue;
    type?: JSONValue;
    value?: JSONValue;
}

type IgnoreImmunityRuleSchema = DamageBypassRuleSchema & {
    /** If present, the resistance value an ignored immunity is treated as having instead of being ignored entirely */
    value: ResolvableValueField<true, true, true>;
};

export { IgnoreImmunityRuleElement };
export type { IgnoreImmunitySource };
