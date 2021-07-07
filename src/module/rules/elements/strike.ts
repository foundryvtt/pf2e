import { CharacterData, NPCData } from '@actor/data';
import { WeaponData } from '@item/data';
import { WeaponDamage } from '@item/weapon/data';
import { RuleElementPF2e } from '../rule-element';
import { RuleElementData, RuleElementSyntheticsPF2e } from '../rules-data-definitions';

/**
 * @category RuleElement
 */
export class PF2StrikeRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData, { strikes }: RuleElementSyntheticsPF2e) {
        const label = this.getDefaultLabel();
        strikes.push({
            _id: this.item.id,
            name: label || this.item.name,
            type: actorData.type === 'npc' ? 'melee' : 'weapon',
            img: this.data.img ?? this.item.img,
            data: {
                description: { value: '', chat: '', unidentified: '' },
                ability: { value: this.data.ability || 'str' },
                weaponType: { value: this.data.category || 'unarmed' },
                group: { value: this.data.group || 'brawling' },
                damage: this.data.damage?.base ?? { dice: 1, die: 'd4', damageType: 'bludgeoning' },
                damageRolls: {},
                attackEffects: { value: [] },
                range: { value: this.data.range || 'melee' },
                strikingRune: { value: '' },
                traits: { value: this.data.traits ?? [], rarity: { value: 'common' }, custom: '' },
                options: { value: this.data.options ?? [] },
                equipped: { value: true },
            },
        } as unknown as WeaponData);
    }
}

export interface PF2StrikeRuleElement {
    data: RuleElementData & {
        img?: string;
        ability?: string;
        category?: string;
        group?: string;
        damage?: WeaponDamage & { base?: number };
        range?: string;
        traits?: string[];
        options?: string[];
    };
}
