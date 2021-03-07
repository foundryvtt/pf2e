import { PF2RuleElement } from '../rules';
import { RuleValue } from '../rule-element';
import { RulePredicate } from '../../modifiers';
import { ActorDataPF2e, CreatureData } from '@actor/actor-data-definitions';
import { CombinedTrait } from '../../damage-calculation';
import { ItemData } from '@item/data-definitions';

/**
 * Use this for automatic damage calculation
 */
interface TypedDamageCalculation {
    type: CombinedTrait;
    value?: RuleValue;
    exceptions?: CombinedTrait[][]; // e.g. [["adamantine", "bludgeoning"], ["physical"]] translates to: except adamantine bludgeoning or physical
    doubleResistanceVsNonMagical?: boolean;
}

/**
 * Use this for simple descriptions that can not be automated, e.g. Vampire Weaknesses
 */
interface UntypedDamageCalculation {
    type?: never;
    value?: never;
    label: string;
    description?: string;
}

export type DamageCalculation = TypedDamageCalculation | UntypedDamageCalculation;

export interface DamageCalculationRuleData {
    type: 'resistance' | 'immunity' | 'weakness';
    data: DamageCalculation;
    predicate: RulePredicate;
}

export class DamageCalculationRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CreatureData) {
        const rule = duplicate(this.ruleData);
        const ruleValue = rule.data;

        if (typeof ruleValue.type === 'string' && (rule.type === 'resistance' || rule.type === 'weakness')) {
            ruleValue.value = super.resolveValue(ruleValue.value ?? 0, rule, this.item, actorData);
        }

        const data = actorData.data;
        if (!Array.isArray(data.damageCalculation)) {
            data.damageCalculation = [];
        }

        // TODO: evaluate predicate to check whether to add the rule
        data.damageCalculation.push(rule);
    }
}

export interface DamageCalculationRuleElement {
    ruleData: DamageCalculationRuleData;
    resolveValue(
        valueData: RuleValue,
        ruleData: DamageCalculationRuleData,
        item: ItemData,
        actorData: ActorDataPF2e,
    ): number;
}
