import { ItemData } from '@item/dataDefinitions';
import { MigrationBase } from './base';

export class Migration599AddTraditionTraits extends MigrationBase {
    static version = 0.599;

    async updateItem(item: ItemData) {
        if (item.type !== 'consumable' || !item.data.spell?.data) return;
        const traditions = duplicate(item.data.spell.data.data.traditions.value);
        for (const tradition of traditions) {
            if (!item.data.traits.value.includes(tradition)) item.data.traits.value.push(tradition);
        }
    }
}
