import {CharacterData, NpcData} from "../actor/actorDataDefinitions";
import {PF2RuleElementData} from "./rulesDataDefinitions";
import {PF2DamageDice, PF2Modifier, PF2ModifierPredicate} from "../modifiers";
import {ItemData} from "../item/dataDefinitions";

export abstract class PF2RuleElement {

    onBeforePrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {
        // do nothing by default
    }
}

export class PF2FlatModifierRuleElement implements PF2RuleElement {

    ruleData: any;
    item: ItemData;

    constructor(ruleData: any, item: ItemData) {
        this.ruleData = ruleData;
        this.item = item;
    }

    onBeforePrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {
        if (this.ruleData.selector && this.ruleData.label && this.ruleData.value && this.ruleData.type) {
            const modifier = new PF2Modifier(this.ruleData.label, this.ruleData.value, this.ruleData.type);
            if (this.ruleData.predicate) {
                modifier.predicate = new PF2ModifierPredicate(this.ruleData.predicate);
                modifier.ignored = !PF2ModifierPredicate.test(modifier.predicate, []);
            }
            statisticsModifiers[this.ruleData.selector] = (statisticsModifiers[this.ruleData.selector] || []).concat(modifier);
        } else {
            console.warn('PF2E | Flat modifier requires at least selector, label, value, and type fields');
        }
    }
}

export class PF2RuleElements {

    static readonly builtin: Record<string, (ruleData: PF2RuleElementData, item: ItemData) => PF2RuleElement> = Object.freeze({
        'PF2E.RuleElement.FlatModifier': (ruleData, item) => new PF2FlatModifierRuleElement(ruleData, item)
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
