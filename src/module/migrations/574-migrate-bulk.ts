import { calculateCarriedArmorBulk, fixWeight } from '../item/bulk';
import { MigrationBase } from './base';

export class Migration574MigrateBulk extends MigrationBase {
    static version = 0.574;
    async updateItem(item: any, actor?: any) {
        const itemName = item?.name?.trim();
        if (['weapon', 'melee', 'armor', 'equipment', 'consumable', 'backpack'].includes(item.type)) {
            // migrate stacked items
            if (itemName?.includes('rrow')) {
                item.data.data.stackGroup.value = 'arrows';
            } else if (itemName?.includes('olt')) {
                item.data.data.stackGroup.value = 'bolts';
            } else if (itemName === 'Rations (1 week)') {
                item.data.data.stackGroup.value = 'rations';
            } else if (itemName === 'Blowgun Darts (10)') {
                item.data.data.stackGroup.value = 'blowgunDarts';
            } else if (itemName === 'Sling Bullets (10)') {
                item.data.data.stackGroup.value = 'slingBullets';
            } else {
                item.data.data.stackGroup.value = '';
            }
            // migrate armor
            if (item.type === 'armor') {
                const weight = item.data?.weight?.value ?? '';
                item.data.data.equippedBulk.value = fixWeight(weight) ?? '';
                item.data.data.weight.value = calculateCarriedArmorBulk(weight);
            } else if (itemName === 'Backpack') {
                item.data.data.weight.value = 'L';
                item.data.data.equippedBulk.value = '0';
            } else if (itemName === 'Satchel') {
                item.data.data.weight.value = 'L';
                item.data.data.equippedBulk.value = '0';
            } else if (itemName === 'Bandolier') {
                item.data.data.weight.value = 'L';
                item.data.data.equippedBulk.value = '0';
            } else if (itemName === 'Saddlebags') {
                item.data.data.weight.value = '1';
                item.data.data.equippedBulk.value = 'L';
            } else if (itemName === 'Tack') {
                item.data.data.weight.value = '2';
                item.data.data.equippedBulk.value = '1';
            } else {
                item.data.data.equippedBulk.value = '';
            }
        }
    }
}
