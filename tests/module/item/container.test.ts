import { getContainerMap, isCycle } from '../../../src/module/item/container';
import { indexBulkItemsById, toBulkItems } from '../../../src/module/item/bulk';
import { PhysicalItemData } from '../../../src/module/item/dataDefinitions';

function createItem({
    id,
    weight = undefined,
    equippedBulk = undefined,
    negateBulk = '',
    bulkCapacity = '',
    containerId = '',
    equipped = false,
}): PhysicalItemData {
    return {
        _id: id,
        type: 'equipment',
        data: {
            negateBulk: {
                value: negateBulk,
            },
            bulkCapacity: {
                value: bulkCapacity,
            },
            containerId: {
                value: containerId,
            },
            equipped: {
                value: equipped,
            },
            weight: {
                value: weight,
            },
            equippedBulk: {
                value: equippedBulk,
            },
            quantity: {
                value: 1,
            },
        },
    } as PhysicalItemData;
}

describe('should create container data', () => {
    test('should create a container map', () => {
        const items: PhysicalItemData[] = [
            // backpack
            createItem({
                id: '1',
                weight: 'L',
                equippedBulk: '0',
                negateBulk: '2',
                bulkCapacity: '4',
                equipped: true,
            }),
            // backpack in backpack
            createItem({
                id: '2',
                weight: 'L',
                equippedBulk: '0',
                negateBulk: '2',
                bulkCapacity: '4',
                containerId: '1',
            }),
            createItem({
                id: '3',
                weight: '1',
                containerId: '2',
            }),
            createItem({
                id: '4',
                weight: '2L',
                containerId: '2',
            }),
            createItem({
                id: '5',
                weight: 'L',
            }),
        ];
        const bulkItemsById = indexBulkItemsById(toBulkItems(items));
        const containerData = getContainerMap({ items, bulkItemsById });

        expect(containerData.size).toBe(5);
        const backPack = containerData.get('1');
        expect(backPack.isInContainer).toBe(false);
        expect(backPack.isContainer).toBe(true);
        expect(backPack.heldItems.length).toBe(1);
        expect(backPack.heldItems[0]._id).toBe('2');
        expect(backPack.formattedHeldItemBulk).toBe('1; 3L');
        expect(backPack.formattedNegateBulk).toBe('2');
        expect(backPack.formattedCapacity).toBe('4');

        const nestedBackPack = containerData.get('2');
        expect(nestedBackPack.isInContainer).toBe(true);
        expect(nestedBackPack.isContainer).toBe(true);
        expect(nestedBackPack.heldItems.length).toBe(2);
        expect(nestedBackPack.heldItems[0]._id).toBe('3');
        expect(nestedBackPack.heldItems[1]._id).toBe('4');
        expect(nestedBackPack.formattedHeldItemBulk).toBe('1; 2L');
        expect(nestedBackPack.formattedNegateBulk).toBe('2');
        expect(nestedBackPack.formattedCapacity).toBe('4');

        const itemInNestedBackPack1 = containerData.get('3');
        expect(itemInNestedBackPack1.isInContainer).toBe(true);
        expect(itemInNestedBackPack1.isContainer).toBe(false);
        expect(itemInNestedBackPack1.heldItems).toEqual([]);
        expect(itemInNestedBackPack1.formattedHeldItemBulk).toBe('-');
        expect(itemInNestedBackPack1.formattedNegateBulk).toBe('-');
        expect(itemInNestedBackPack1.formattedCapacity).toBe('-');

        const itemInNestedBackPack2 = containerData.get('4');
        expect(itemInNestedBackPack2.isInContainer).toBe(true);
        expect(itemInNestedBackPack2.isContainer).toBe(false);
        expect(itemInNestedBackPack2.heldItems).toEqual([]);
        expect(itemInNestedBackPack2.formattedHeldItemBulk).toBe('-');
        expect(itemInNestedBackPack2.formattedNegateBulk).toBe('-');
        expect(itemInNestedBackPack2.formattedCapacity).toBe('-');

        const tobLevelItem = containerData.get('5');
        expect(tobLevelItem.isInContainer).toBe(false);
        expect(tobLevelItem.isContainer).toBe(false);
        expect(tobLevelItem.heldItems).toEqual([]);
        expect(tobLevelItem.formattedHeldItemBulk).toBe('-');
        expect(tobLevelItem.formattedNegateBulk).toBe('-');
        expect(tobLevelItem.formattedCapacity).toBe('-');
    });

    test('should calculate container capacity percentage', () => {
        const items = [
            // backpack
            createItem({
                id: '1',
                weight: 'L',
                equippedBulk: '0',
                negateBulk: '2',
                bulkCapacity: '4',
                equipped: true,
            }),
            createItem({
                id: '2',
                weight: '4; 9L',
                containerId: '1',
            }),
            // belt pouch
            createItem({
                id: '3',
                weight: 'L',
                equippedBulk: '0',
                bulkCapacity: '4L',
                equipped: true,
            }),
            createItem({
                id: '4',
                weight: '4L',
                containerId: '3',
            }),
            // overloaded belt pouch
            createItem({
                id: '5',
                weight: 'L',
                equippedBulk: '0',
                bulkCapacity: '4L',
                equipped: true,
            }),
            createItem({
                id: '6',
                weight: '5L',
                containerId: '5',
            }),
            // overloaded backpack
            createItem({
                id: '7',
                weight: 'L',
                equippedBulk: '0',
                negateBulk: '2',
                bulkCapacity: '4',
                equipped: true,
            }),
            createItem({
                id: '8',
                weight: '5',
                containerId: '7',
            }),
        ];
        const bulkItemsById = indexBulkItemsById(toBulkItems(items));
        const containerData = getContainerMap({ items, bulkItemsById });

        expect(containerData.size).toBe(8);

        const backpack = containerData.get('1');
        expect(backpack.fullPercentage).toBe(98);
        expect(backpack.fullPercentageMax100).toBe(98);
        expect(backpack.isOverLoaded).toBe(false);

        const backpackItem = containerData.get('2');
        expect(backpackItem.fullPercentage).toBe(0);

        const beltPouch = containerData.get('3');
        expect(beltPouch.fullPercentage).toBe(100);
        expect(beltPouch.fullPercentageMax100).toBe(100);
        expect(beltPouch.isOverLoaded).toBe(false);

        const beltPouchItem = containerData.get('4');
        expect(beltPouchItem.fullPercentage).toBe(0);

        const overloadedPouch = containerData.get('5');
        expect(overloadedPouch.fullPercentage).toBe(125);
        expect(overloadedPouch.fullPercentageMax100).toBe(100);
        expect(overloadedPouch.isOverLoaded).toBe(true);

        const overloadedBackpack = containerData.get('7');
        expect(overloadedBackpack.fullPercentage).toBe(100);
        expect(overloadedBackpack.isOverLoaded).toBe(true);
    });

    test('should detect container cycles', () => {
        const items = [
            createItem({
                id: '1',
            }),
            createItem({
                id: '2',
                containerId: '1',
            }),
            createItem({
                id: '3',
            }),
            createItem({
                id: '4',
                containerId: '2',
            }),
        ];

        expect(isCycle('1', '3', items)).toBe(false);
        expect(isCycle('3', '1', items)).toBe(false);
        expect(isCycle('2', '1', items)).toBe(false);
        expect(isCycle('2', '3', items)).toBe(false);
        expect(isCycle('1', '1', items)).toBe(true);
        expect(isCycle('1', '4', items)).toBe(true);
        expect(isCycle('1', '2', items)).toBe(true);
        expect(isCycle('2', '2', items)).toBe(true);
    });
});
