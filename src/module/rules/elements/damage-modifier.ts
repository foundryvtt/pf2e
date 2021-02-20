import { PF2RuleElement } from '../rules';
import { RuleValue } from '../rule-element';
import { RulePredicate } from '../../modifiers';
import { FamiliarData, LabeledValue, NpcData, CharacterData } from '@actor/actor-data-definitions';

interface RuleConfiguration {
    type: 'resistance' | 'immunity' | 'weakness';
    damageType: string;
    value?: RuleValue;
    exceptions?: string;
    predicate: RulePredicate;
}

function mergeLabeledValues(
    values: LabeledValue[],
    damageType: string,
    value: number,
    exceptions: string | undefined,
): LabeledValue[] {
    // const damageOrResistanceTypes = Object.assign({}, CONFIG.PF2E.resistanceTypes, CONFIG.PF2E.weaknessTypes);
    // return mergeLabeledValues(
    //     values.concat({
    //         label: damageOrResistanceTypes[damageType],
    //         value: value,
    //         type: damageType,
    //         exceptions: exceptions,
    //     }),
    // );
    return [];
}

/**
 * Use this rule in the following way:
 * {
 *     "key": "PF2E.RuleElement.DamageModifier",
 *     "type": "resistance",  // could also be immunity or weakness
 *     "damageType": "fire",  // any key of CONFIG.resistanceTypes, CONFIG.weaknessTypes, CONFIG.immunityTypes
 *     "value": 5, // could also be a bracket or string, similar to damage dice, unused if immunity
 *     "exceptions": "adamantine bludgeoning",  // only stacks with the same exception type, use null,
 *     "predicate": {...}  // optional predicate
 * }
 */
export class DamageModifierRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData) {
        const traits = actorData.data.traits;
        const value = duplicate(this.ruleData) as RuleConfiguration;

        // TODO: implement predicate
        if (value.type === 'resistance' || value.type === 'weakness') {
            const modifierValue = super.resolveValue(this.ruleData.value, this.ruleData, this.item, actorData);
            if (value.type === 'resistance') {
                traits.dr = mergeLabeledValues(traits.dr, value.damageType, modifierValue, value.exceptions);
            } else {
                traits.dv = mergeLabeledValues(traits.dv, value.damageType, modifierValue, value.exceptions);
            }
        } else {
            // only keep unique values
            const immunities = new Set(traits.di.value.concat(value.damageType));
            traits.di.value = Array.from(immunities);
        }
    }
}
