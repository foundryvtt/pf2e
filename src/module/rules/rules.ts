import {CharacterData, NpcData} from "../actor/actorDataDefinitions";
import {ItemData} from "../item/dataDefinitions";
import {PF2RuleElementData} from "./rulesDataDefinitions";
import {PF2DamageDice, PF2Modifier, PF2ModifierPredicate, PF2ModifierType} from "../modifiers";
import {PF2RuleElement} from './rule-element';
import {PF2MageArmorRuleElement} from "./spells/mage-armor";
import {PF2TempHPRuleElement} from "./elements/temphp";

export {PF2RuleElement};

export class PF2FlatModifierRuleElement extends PF2RuleElement {

    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        super();
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {
        const label = this.ruleData.label ?? this.item?.name;
        const type = this.ruleData.type ?? PF2ModifierType.UNTYPED;
        if (this.ruleData.selector && label && this.ruleData.value) {
            const modifier = new PF2Modifier(label, this.ruleData.value, type);
            if (this.ruleData.predicate) {
                modifier.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
                modifier.ignored = !PF2ModifierPredicate.test(modifier.predicate, []);
            }
            statisticsModifiers[this.ruleData.selector] = (statisticsModifiers[this.ruleData.selector] || []).concat(modifier);
        } else {
            console.warn('PF2E | Flat modifier requires at least a selector field, a label field or item name, and a non-zero value field');
        }
    }
}

export class PF2RuleElements {

    static readonly builtin: Record<string, (ruleData: PF2RuleElementData, item: ItemData) => PF2RuleElement> = Object.freeze({
        'PF2E.RuleElement.FlatModifier': (ruleData, item) => new PF2FlatModifierRuleElement(ruleData, item),
        'PF2E.RuleElement.MageArmor':  (ruleData, item) => new PF2MageArmorRuleElement(ruleData, item),
        'PF2E.RuleElement.TempHP':  (ruleData, item) => new PF2TempHPRuleElement(ruleData, item),
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
