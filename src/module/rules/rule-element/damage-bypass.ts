import type { DeferredValueParams } from "@actor/modifiers.ts";
import type { ImmunityType } from "@actor/types.ts";
import type { DamageIRBypassData, DowngradedImmunity, IgnoredResistance } from "@system/damage/types.ts";
import { objectHasKey } from "@util";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * A base for rule elements that let damage ignore or reduce a target's immunities and resistances
 * @category RuleElement
 */
abstract class DamageBypassRuleElement<TSchema extends DamageBypassRuleSchema> extends RuleElement<TSchema> {
    static override defineSchema(): DamageBypassRuleSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            type: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), {
                required: true,
                min: 1,
            }),
        };
    }

    /** Create the bypass contributed by this rule element, which is only called after its predicate has passed */
    protected abstract createBypass(options: DeferredValueParams): DamageBypassContribution | null;

    /** Resolve this rule element's types, failing validation if any is missing from the given dictionary */
    protected resolveTypes<T extends string>(dictionary: Record<T, string>): T[] | null {
        const resolved = this.resolveInjectedProperties(this.type);
        const types = resolved.filter((t): t is T => objectHasKey(dictionary, t));
        for (const type of resolved.filter((t) => !objectHasKey(dictionary, t))) {
            this.failValidation(`Type "${type}" is unrecognized`);
        }
        return types.length === resolved.length ? types : null;
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        for (const selector of this.resolveInjectedProperties(this.selector)) {
            if (selector === "null") continue;

            const deferredBypass = (options: DeferredValueParams = {}): DamageIRBypassData => {
                const bypass: DamageIRBypassData = {
                    immunity: { ignore: [], downgrade: [], redirect: [] },
                    resistance: { ignore: [], redirect: [] },
                };

                const testPassed =
                    this.predicate.length === 0 ||
                    this.resolveInjectedProperties(this.predicate).test([
                        ...(options.test ?? this.actor.getRollOptions([selector])),
                        ...this.item.getRollOptions("parent"),
                    ]);
                if (!testPassed) return bypass;

                const contribution = this.createBypass(options);
                bypass.immunity.ignore.push(...(contribution?.immunity?.ignore ?? []));
                bypass.immunity.downgrade.push(...(contribution?.immunity?.downgrade ?? []));
                bypass.resistance.ignore.push(...(contribution?.resistance?.ignore ?? []));
                return bypass;
            };

            const synthetics = (this.actor.synthetics.damageBypasses[selector] ??= []);
            synthetics.push(deferredBypass);
        }
    }
}

interface DamageBypassRuleElement<TSchema extends DamageBypassRuleSchema>
    extends RuleElement<TSchema>, ModelPropsFromRESchema<DamageBypassRuleSchema> {}

interface DamageBypassContribution {
    immunity?: { ignore?: ImmunityType[]; downgrade?: DowngradedImmunity[] };
    resistance?: { ignore?: IgnoredResistance[] };
}

type DamageBypassRuleSchema = RuleElementSchema & {
    /** All domains to apply this bypass within */
    selector: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
    /** One or more immunity or resistance types, resolved at the time damage is rolled */
    type: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
};

export { DamageBypassRuleElement };
export type { DamageBypassContribution, DamageBypassRuleSchema };
