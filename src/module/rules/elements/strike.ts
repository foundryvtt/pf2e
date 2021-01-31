import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';

/**
 * @category RuleElement
 */
export class PF2StrikeRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData, { strikes }: PF2RuleElementSynthetics) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        strikes.push({
            _id: this.item._id,
            name: label,
            type: actorData.type === 'npc' ? 'melee' : 'weapon',
            img: this.ruleData.img ?? this.item.img,
            data: {
                ability: { value: this.ruleData.ability || 'str' },
                weaponType: { value: this.ruleData.category || 'unarmed' },
                group: { value: this.ruleData.group || 'brawling' },
                damage: this.ruleData.damage?.base ?? { dice: 1, die: 'd4', damageType: 'bludgeoning' },
                range: { value: this.ruleData.range || 'melee' },
                traits: { value: this.ruleData.traits ?? [] },
                options: { value: this.ruleData.options ?? [] },
                equipped: { value: true },
            },
        } as any);
    }
}
