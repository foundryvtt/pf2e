import {ItemData} from "../item/dataDefinitions";
import {PF2RuleElementData} from "./rulesDataDefinitions";
import {PF2RuleElement} from './rule-element';
import {PF2FlatModifierRuleElement} from "./elements/flatmodifier";
import {PF2MageArmorRuleElement} from "./spells/mage-armor";
import {PF2FixedProficiencyRuleElement} from "./elements/fixed-proficiency";
import {PF2TempHPRuleElement} from "./elements/temphp";
import {PF2DexterityModifierCapRuleElement} from "./elements/dexterity-modifier-cap";
import {PF2DamageDiceRuleElement} from "./elements/damage-dice";
import {PF2TogglePropertyRuleElement} from "./elements/toggle-property";

export {PF2RuleElement};

export class PF2RuleElements {

    static readonly builtin: Record<string, (ruleData: PF2RuleElementData, item: ItemData) => PF2RuleElement> = Object.freeze({
        'PF2E.RuleElement.FlatModifier': (ruleData, item) => new PF2FlatModifierRuleElement(ruleData, item),
        'PF2E.RuleElement.MageArmor':  (ruleData, item) => new PF2MageArmorRuleElement(ruleData, item),
        'PF2E.RuleElement.DexterityModifierCap':  (ruleData, item) => new PF2DexterityModifierCapRuleElement(ruleData, item),
        'PF2E.RuleElement.FixedProficiency':  (ruleData, item) => new PF2FixedProficiencyRuleElement(ruleData, item),
        'PF2E.RuleElement.TempHP':  (ruleData, item) => new PF2TempHPRuleElement(ruleData, item),
        'PF2E.RuleElement.DamageDice': (ruleData, item) => new PF2DamageDiceRuleElement(ruleData, item),
        'PF2E.RuleElement.ToggleProperty': (ruleData, item) => new PF2TogglePropertyRuleElement(ruleData, item),
    });

    static custom: Record<string, (ruleData: PF2RuleElementData, item: ItemData) => PF2RuleElement> = {}

    static fromOwnedItem(item: ItemData): PF2RuleElement[] {
        return this.fromRuleElementData(item.data?.rules ?? [], item);
    }

    static fromRuleElementData(ruleData: PF2RuleElementData[], item: ItemData): PF2RuleElement[] {
        const rules = []
        for (const data of ruleData) {
            const rule = this.custom[data.key] ?? this.builtin[data.key];
            if (rule) {
                rules.push(rule(data, item));
            } else {
                console.warn(`PF2E | Unknown rule element ${data.key}`);
            }
        }
        return rules;
    }
}
