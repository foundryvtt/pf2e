import type { DeferredValueParams } from "@actor/modifiers.ts";
import { DamageBypassContribution, DamageBypassRuleElement, DamageBypassRuleSchema } from "./damage-bypass.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSource } from "./data.ts";

/**
 * Causes damage from the given selector(s) to ignore a quantity of a target's resistance to one or more types, up to
 * the resolved value. If no value is given, the resistance is ignored entirely.
 *
 * @category RuleElement
 */
class IgnoreResistanceRuleElement extends DamageBypassRuleElement<IgnoreResistanceRuleSchema> {
    static override defineSchema(): IgnoreResistanceRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: true, initial: null }),
        };
    }

    protected override createBypass(options: DeferredValueParams): DamageBypassContribution | null {
        const types = this.resolveTypes(CONFIG.PF2E.resistanceTypes);
        if (!types) return null;
        if (this.value === null) return { resistance: { ignore: types.map((type) => ({ type, max: Infinity })) } };

        const value = Math.floor(Number(this.resolveValue(this.value, 0, options)));
        if (!Number.isInteger(value) || value <= 0) {
            if (value !== 0) this.failValidation("value must resolve to a positive integer or be null");
            return null;
        }

        return { resistance: { ignore: types.map((type) => ({ type, max: value })) } };
    }
}

interface IgnoreResistanceRuleElement
    extends DamageBypassRuleElement<IgnoreResistanceRuleSchema>, ModelPropsFromRESchema<IgnoreResistanceRuleSchema> {}

interface IgnoreResistanceSource extends RuleElementSource {
    selector?: JSONValue;
    type?: JSONValue;
    value?: JSONValue;
}

type IgnoreResistanceRuleSchema = DamageBypassRuleSchema & {
    /** The quantity of resistance to ignore, resolved at the time damage is rolled: if absent, all of it */
    value: ResolvableValueField<true, true, true>;
};

export { IgnoreResistanceRuleElement };
export type { IgnoreResistanceSource };
