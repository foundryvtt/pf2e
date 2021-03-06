import { PF2RuleElement } from '../rules';
import { RuleValue } from '../rule-element';
import { RulePredicate } from '../../modifiers';
import { CharacterData, FamiliarData, NpcData } from '@actor/actor-data-definitions';
import { CombinedTrait } from '../../damage-calculation';

/**
 * Use this for automatic damage calculation
 */
interface TypedDamageCalculation {
    type: CombinedTrait;
    value?: RuleValue;
    exceptions?: CombinedTrait[][]; // e.g. [["adamantine", "bludgeoning"], ["physical"]] translates to: except adamantine bludgeoning or physical
    doubleResistanceVsNonMagical?: boolean;
}

export function isTyped(value: TypedDamageCalculation | UntypedDamageCalculation): value is TypedDamageCalculation {
    return 'type' in value;
}

/**
 * Use this for simple descriptions that can not be automated, e.g. Vampire Weaknesses
 */
export interface UntypedDamageCalculation {
    label: string;
    description?: string;
}

export interface DamageCalculationRuleData {
    type: 'resistance' | 'immunity' | 'weakness';
    data: TypedDamageCalculation | UntypedDamageCalculation;
    predicate: RulePredicate;
}

export class DamageCalculationRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData) {
        const rule = duplicate(this.ruleData) as DamageCalculationRuleData;
        const ruleValue = rule.data;

        if (isTyped(ruleValue)) {
            if (rule.type === 'resistance' || rule.type === 'weakness') {
                ruleValue.value = super.resolveValue(ruleValue.value ?? 0, rule, this.item, actorData) as number;
            }
        }

        const data = actorData.data;
        if (data.damageCalculation === undefined || data.damageCalculation === null) {
            data.damageCalculation = [];
        }

        // TODO: evaluate predicate to check whether to add the rule
        data.damageCalculation.push(rule);
    }
}
