import { CharacterData, NPCData } from '@actor/data';
import { WeaponData } from '@item/data';
import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e } from '../rules-data-definitions';

/**
 * @category RuleElement
 */
export class PF2StrikeRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { strikes }: RuleElementSyntheticsPF2e) {
        const label = super.getDefaultLabel(this.ruleData, this.item);
        strikes.push({
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
                strikingRune: { value: '' },
                traits: { value: this.ruleData.traits ?? [], rarity: { value: 'common' }, custom: '' },
                options: { value: this.ruleData.options ?? [] },
                equipped: { value: true },
            },
        } as unknown as WeaponData);
    }
}
