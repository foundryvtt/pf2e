import { PF2RuleElement } from '../rules';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';
import { RuleValue } from '../rule-element';
import { CharacterData, FamiliarData, LabeledValue, NpcData } from '../../actor/actorDataDefinitions';
import { groupBy, max, toNumber } from '../../utils';

interface RuleConfiguration {
    type: 'resistance' | 'immunity' | 'weakness';
    damageType: string;
    value?: RuleValue;
    exceptions?: string;
}

function mergeLabeledValues(
    values: LabeledValue[],
    damageType: string,
    value: number,
    exceptions: string,
): LabeledValue[] {
    const damageOrResistanceTypes = Object.assign({}, CONFIG.PF2E.resistanceTypes, CONFIG.PF2E.weaknessTypes);
    const mergedValues = values.concat({
        label: damageOrResistanceTypes[damageType],
        value: value,
        type: damageType,
        exceptions: exceptions,
    });
    const valuesByType = groupBy(mergedValues, (value) => value.type);
    return Array.from(valuesByType.entries()).flatMap(([, value]) => {
        // fire resistance 5 and fire resistance 10 collapse to fire resistance 10
        // physical 5 (except silver) and physical 5 (except adamantine) are kept
        const groupedByException = groupBy(value, (value) => value.exceptions ?? null);
        return Array.from(groupedByException.entries()).map(([, value]) => {
            return max(value, (val) => toNumber(val.value) ?? 0);
        });
    });
}

/**
 * Use this rule in the following way:
 * {
 *     "key": "PF2E.RuleElement.DamageModifier"
 *     "type": "resistance",  // could also be immunity or weakness
 *     "value": 5, // could also be a bracket or string, similar to damage dice, unused if immunity
 *     "exceptions": "adamantine bludgeoning"  // only stacks with the same exception type, use null
 * }
 */
export class DamageModifierRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {
        const traits = actorData.data.traits;
        const value = duplicate(this.ruleData) as RuleConfiguration;

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
