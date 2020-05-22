import { getContainerMap } from '../../../dist/module/item/container.js';
import { stacks, itemsFromActorData } from '../../../src/module/item/bulk.js';

function createItem({
    id,
    weight,
    equippedBulk = undefined,
    negateBulk = '',
    bulkCapacity = '',
    containerId = '',
    equipped = false
}) {
    return {
        _id: id,
        type: 'equipment',
        data: {
            negateBulk: {
                value: negateBulk
            },
            bulkCapacity: {
                value: bulkCapacity
            },
            containerId: {
                value: containerId
            },
            equipped: {
                value: equipped
            },
            weight: {
                value: weight
            },
            equippedBulk: {
                value: equippedBulk
            },
            quantity: {
                value: 1
            }
        }
    };
}

describe('should create container data', () => {
    test('should create a container map', () => {
        const items = [
            // backpack
            createItem({
                id: '1',
                weight: 'L',
                equippedBulk: '0',
                negateBulk: '2',
                bulkCapacity: '4',
                equipped: true
            }),
            // backpack in backpack
            createItem({
                id: '2',
                weight: 'L',
                equippedBulk: '0',
                negateBulk: '2',
                bulkCapacity: '4',
                containerId: '1'
            }),
            createItem({
                id: '3',
                weight: '1',
                containerId: '2'
            }),
            createItem({
                id: '4',
                weight: '2L',
                containerId: '2'
            }),
            createItem({
                id: '5',
                weight: 'L',
            }),
        ];
        const bulkItems = itemsFromActorData({ items });
        const containerData = getContainerMap(items, bulkItems, stacks);

        expect(containerData.size)
            .toBe(5);
        const backPack = containerData.get('1');
        expect(backPack.isInContainer)
            .toBe(false);
        expect(backPack.isContainer)
            .toBe(true);
        expect(backPack.heldItems.length)
            .toBe(1);
        expect(backPack.heldItems[0]._id)
            .toBe('2');
        expect(backPack.formattedHeldItemBulk)
            .toBe('1; 3L');
        expect(backPack.formattedNegateBulk)
            .toBe('2');
        expect(backPack.formattedCapacity)
            .toBe('4');

        const nestedBackPack = containerData.get('2');
        expect(nestedBackPack.isInContainer)
            .toBe(true);
        expect(nestedBackPack.isContainer)
            .toBe(true);
        expect(nestedBackPack.heldItems.length)
            .toBe(2);
        expect(nestedBackPack.heldItems[0]._id)
            .toBe('3');
        expect(nestedBackPack.heldItems[1]._id)
            .toBe('4');
        expect(nestedBackPack.formattedHeldItemBulk)
            .toBe('1; 2L');
        expect(nestedBackPack.formattedNegateBulk)
            .toBe('2');
        expect(nestedBackPack.formattedCapacity)
            .toBe('4');

        const itemInNestedBackPack1 = containerData.get('3');
        expect(itemInNestedBackPack1.isInContainer)
            .toBe(true);
        expect(itemInNestedBackPack1.isContainer)
            .toBe(false);
        expect(itemInNestedBackPack1.heldItems)
            .toEqual([]);
        expect(itemInNestedBackPack1.formattedHeldItemBulk)
            .toBe('-');
        expect(itemInNestedBackPack1.formattedNegateBulk)
            .toBe('-');
        expect(itemInNestedBackPack1.formattedCapacity)
            .toBe('-');

        const itemInNestedBackPack2 = containerData.get('4');
        expect(itemInNestedBackPack2.isInContainer)
            .toBe(true);
        expect(itemInNestedBackPack2.isContainer)
            .toBe(false);
        expect(itemInNestedBackPack2.heldItems)
            .toEqual([]);
        expect(itemInNestedBackPack2.formattedHeldItemBulk)
            .toBe('-');
        expect(itemInNestedBackPack2.formattedNegateBulk)
            .toBe('-');
        expect(itemInNestedBackPack2.formattedCapacity)
            .toBe('-');

        const tobLevelItem = containerData.get('5');
        expect(tobLevelItem.isInContainer)
            .toBe(false);
        expect(tobLevelItem.isContainer)
            .toBe(false);
        expect(tobLevelItem.heldItems)
            .toEqual([]);
        expect(tobLevelItem.formattedHeldItemBulk)
            .toBe('-');
        expect(tobLevelItem.formattedNegateBulk)
            .toBe('-');
        expect(tobLevelItem.formattedCapacity)
            .toBe('-');
    });


});