import { CharacterData, NPCData } from '@actor/data-definitions';
import { WeaponData } from '@item/data-definitions';
import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rules-data-definitions';

/**
 * @category RuleElement
 */
export class PF2StrikeRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NPCData, { strikes }: PF2RuleElementSynthetics) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        strikes.push(({
            _id: this.item._id,
            name: label,
            type: actorData.type === 'npc' ? 'melee' : 'weapon',
            img: this.ruleData.img ?? this.item.img,
            data: {
                description: { value: '', chat: '', unidentified: '' },
                ability: { value: this.ruleData.ability || 'str' },
                weaponType: { value: this.ruleData.category || 'unarmed' },
                group: { value: this.ruleData.group || 'brawling' },
                damage: this.ruleData.damage?.base ?? { dice: 1, die: 'd4', damageType: 'bludgeoning' },
                damageRolls: {},
                attackEffects: { value: [] },
                range: { value: this.ruleData.range || 'melee' },
                traits: { value: this.ruleData.traits ?? [], rarity: { value: 'common' }, custom: '' },
                options: { value: this.ruleData.options ?? [] },
                equipped: { value: true },
            },
        } as unknown) as WeaponData);
    }
}
