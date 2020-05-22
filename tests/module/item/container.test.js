import { getContainerMap } from '../../../dist/module/item/container.js';
import { stacks } from '../../../src/module/item/bulk.js';

function createItem(id, weight, equippedBulk, negateBulk, bulkCapacity, containerId = '', equipped = false) {
    return {
        _id: id,
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
        }
    };
}

describe('should create container data', () => {
    test('should create a container map', () => {
        const items = [
            // backpack
            createItem('1', 'L', '', '2', '4', '', true),
            // backpack
            createItem('2', 'L', '', '2', '4', '1'),
            createItem('3', '1', '', '', '', '2'),
            createItem('4', '2L', '', '', '', '2'),
            createItem('5', 'L', '', '', ''),
        ];

        const containerData = getContainerMap(items, stacks);

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
        expect(backPack.formattedHeldItemBulk)
            .toBe('1; 2L');
        expect(backPack.formattedNegateBulk)
            .toBe('2');
        expect(backPack.formattedCapacity)
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