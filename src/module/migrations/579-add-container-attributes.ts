import { MigrationBase } from './base';

export class Migration579AddContainerAttributes extends MigrationBase {
    static version = 0.579;
    async updateItem(item: any, actor?: any) {
        if (['weapon', 'melee', 'armor', 'equipment', 'consumable', 'backpack'].includes(item.type)) {
            const itemName = item?.name?.trim();
            if (itemName === 'Backpack') {
                item.data.data.bulkCapacity.value = '4';
                item.data.data.negateBulk.value = '2';
            } else if (itemName === 'Bag of Devouring Type I') {
                item.data.data.bulkCapacity.value = '50';
                item.data.data.negateBulk.value = '50';
            } else if (itemName === 'Bag of Devouring Type II') {
                item.data.data.bulkCapacity.value = '100';
                item.data.data.negateBulk.value = '100';
            } else if (itemName === 'Bag of Devouring Type III') {
                item.data.data.bulkCapacity.value = '150';
                item.data.data.negateBulk.value = '150';
            } else if (itemName === 'Bag of Holding (Type I)') {
                item.data.data.bulkCapacity.value = '25';
                item.data.data.negateBulk.value = '25';
            } else if (itemName === 'Bag of Holding (Type II)') {
                item.data.data.bulkCapacity.value = '50';
                item.data.data.negateBulk.value = '50';
            } else if (itemName === 'Bag of Holding (Type III)') {
                item.data.data.bulkCapacity.value = '100';
                item.data.data.negateBulk.value = '100';
            } else if (itemName === 'Bag of Holding (Type IV)') {
                item.data.data.bulkCapacity.value = '150';
                item.data.data.negateBulk.value = '150';
            } else if (itemName === 'Bag of Weasels') {
                item.data.data.bulkCapacity.value = '25';
                item.data.data.negateBulk.value = '25';
            } else if (itemName === 'Gloves of Carelessness') {
                item.data.data.bulkCapacity.value = '1';
                item.data.data.negateBulk.value = '1';
            } else if (itemName === 'Gloves of Storing') {
                item.data.data.bulkCapacity.value = '1';
                item.data.data.negateBulk.value = '1';
            } else if (itemName === 'Belt Pouch') {
                item.data.data.bulkCapacity.value = '4L';
                item.data.data.negateBulk.value = '0';
            } else if (itemName === "Pathfinder's Pouch") {
                // FIXME: 1 bulk is in an extradimensional container
                item.data.data.bulkCapacity.value = '4L';
                item.data.data.negateBulk.value = '0';
            } else if (itemName === 'Knapsack of Halflingkind') {
                item.data.data.bulkCapacity.value = '50';
                item.data.data.negateBulk.value = '50';
            } else if (itemName === 'Knapsack of Halflingkind (Greater)') {
                item.data.data.bulkCapacity.value = '50';
                item.data.data.negateBulk.value = '50';
            } else if (itemName === 'Sack (5)') {
                item.data.data.bulkCapacity.value = '8';
                item.data.data.negateBulk.value = '0';
            } else if (itemName === 'Satchel') {
                item.data.data.bulkCapacity.value = '2';
                item.data.data.negateBulk.value = '0';
            } else if (itemName === 'Bandolier') {
                item.data.data.bulkCapacity.value = '8L';
                item.data.data.negateBulk.value = '0';
            } else if (itemName === 'Saddlebags') {
                // FIXME: a saddlebag has 2 parts, each one carrying 3 bulk
                item.data.data.bulkCapacity.value = '3';
                item.data.data.negateBulk.value = '0';
            } else if (itemName === 'Chest') {
                item.data.data.bulkCapacity.value = '8';
                item.data.data.negateBulk.value = '0';
            } else {
                item.data.data.bulkCapacity.value = '';
                item.data.data.negateBulk.value = '0';
            }
            item.data.data.containerId.value = '';
        }
    }
}
