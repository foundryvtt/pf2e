import {ItemData, WeaponData} from "../../item/dataDefinitions";
import {CharacterData, NpcData} from "../../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier} from "../../modifiers";
import {PF2RuleElement} from "../rule-element";

/**
 * @category RuleElement
 */
export class PF2StrikeRuleElement extends PF2RuleElement {

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
        damageDice: Record<string, PF2DamageDice[]>,
        strikes: WeaponData[]
    ) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        strikes.push({
            _id: this.item._id,
            name: label,
            type: (actorData.type === 'npc' ? 'melee' : 'weapon'),
            img: this.ruleData.img ?? this.item.img,
            data: {
                ability: { value: this.ruleData.ability ?? 'str' },
                weaponType: { value: this.ruleData.category ?? 'simple' },
                damage: this.ruleData.damage?.base ?? { dice: 1, die: 'd4', damageType: 'bludgeoning' },
                range: { value: this.ruleData.range ?? 'melee' },
                traits: { value: this.ruleData.traits ?? [] },
                equipped: { value: true },
            }
        } as any);
    }
}
