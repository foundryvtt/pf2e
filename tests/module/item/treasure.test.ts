import {calculateWealth, addCoins, findAllTreasure} from '../../../src/module/item/treasure';
import { ItemData, TreasureData } from 'src/module/item/dataDefinitions';

/** Create treasure item data for testing. */
function createTreasure({
    id = "ignore",
    type = "treasure",
    denomination = "gp",
    quantity = 1,
    value = 1,
    stackGroup = undefined,
    containerId = undefined
}): TreasureData {
    return {
        _id: id,
        type: type as any,
        data: {
            denomination: { value: denomination as "cp" | "sp" | "gp" | "pp" },
            quantity: { value: quantity },
            value: { value: value.toString() },
            stackGroup: { value: stackGroup },
            containerId: { value: containerId }
        }
    } as any as TreasureData;
}

describe('should calculate wealth based on inventory', () => {
    test('empty inventory', () => {
        const items = [];

        const result = calculateWealth(items);
        expect(result)
            .toEqual({
                pp: 0,
                gp: 0,
                sp: 0,
                cp: 0,
            });
    });

    test('sums up treasure', () => {
        const items = [
            { _id: 'ignore', type: 'treasure', data: {} } as any as ItemData,
            createTreasure({ type: 'no treasure type', denomination: 'gp', }),
            createTreasure({ type: 'treasure', denomination: 'pp', quantity: 10 }),
            createTreasure({ type: 'treasure', denomination: 'gp', quantity: 9 }),
            createTreasure({ type: 'treasure', denomination: 'sp', quantity: 8, }),
            createTreasure({ type: 'treasure', denomination: 'cp', quantity: 7, })
        ];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 10,
            gp: 9,
            sp: 8,
            cp: 7,
        });
    });

    test('adjusts value', () => {
        const items = [
            createTreasure({ denomination: 'pp', quantity: 10, value: 2 }),
            createTreasure({ denomination: 'gp', quantity: 9, value: 3 }),
            createTreasure({ denomination: 'sp', quantity: 8, value: 4 }),
            createTreasure({ denomination: 'cp', quantity: 7, value: 5 })
        ];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 20,
            gp: 27,
            sp: 32,
            cp: 35,
        });
    });

    test('should be able to add coins to an existing stack', async () => {
        const compendiumIdAndQuantity = new Map();
        const itemIdAndQuantity = new Map();
        await addCoins({
            items: [
                // ignored because of only value 1 is taken
                createTreasure({ id: '1', denomination: 'gp', quantity: 7, value: 5, stackGroup: 'coins' }),
                createTreasure({ id: '2', denomination: 'gp', quantity: 7, value: 1, stackGroup: 'coins' }),
                // ignored becase not added
                createTreasure({ id: '3', denomination: 'sp', quantity: 6, value: 1, stackGroup: 'coins' }),
                // ignored becase in a container
                createTreasure({
                    id: '4',
                    denomination: 'cp',
                    quantity: 6,
                    value: 1,
                    stackGroup: 'coins',
                    containerId: 'yo'
                }),
            ],
            combineStacks: true,
            addFromCompendium: async (compendiumId, quantity) => {
                compendiumIdAndQuantity.set(compendiumId, quantity);
            },
            updateItemQuantity: async (item, quantity) => {
                itemIdAndQuantity.set(item._id, quantity);
            },
            coins: {
                pp: 3,
                gp: 6,
                sp: 0,
                cp: 4,
            },
        });

        expect(itemIdAndQuantity.size)
            .toBe(1);
        expect(itemIdAndQuantity.has('2'))
            .toBe(true);
        expect(itemIdAndQuantity.get('2'))
            .toBe(6);

        expect(compendiumIdAndQuantity.size)
            .toBe(2);
        expect(compendiumIdAndQuantity.has('JuNPeK5Qm1w6wpb4'))
            .toBe(true);
        expect(compendiumIdAndQuantity.get('JuNPeK5Qm1w6wpb4'))
            .toBe(3);
        expect(compendiumIdAndQuantity.has('lzJ8AVhRcbFul5fh'))
            .toBe(true);
        expect(compendiumIdAndQuantity.get('lzJ8AVhRcbFul5fh'))
            .toBe(4);
    });

    test('sell ignores coins', () => {
        const value = findAllTreasure([
            createTreasure({ id: '1', denomination: 'gp', quantity: 7, value: 5, stackGroup: 'coins' })
        ]);

        expect(value).toEqual({
            treasureIds: [],
            coins: {
                pp: 0,
                gp: 0,
                sp: 0,
                cp: 0,
            },
        });
    });

    test('sell without coins has the same value as calculateWealth', () => {
        const items = [
            { _id: 'ignore', type: 'treasure', data: {} } as any as TreasureData,
            createTreasure({ type: 'no treasure type', denomination: 'gp', quantity: 1, value: 1 }),
            createTreasure({ denomination: 'pp', quantity: 10, value: 1 }),
            createTreasure({ denomination: 'gp', quantity: 9, value: 1 }),
            createTreasure({ denomination: 'sp', quantity: 8, value: 1 }),
            createTreasure({ denomination: 'cp', quantity: 7, value: 1 }),
        ];

        const {coins} = findAllTreasure(items);
        const wealth = calculateWealth(items);

        expect(coins).toEqual(wealth);
    });

    test('sell only finds treasure', () => {
        const items = [
            { type: 'weapon', _id: 'weapon', data: {} } as any as ItemData,
            createTreasure({ id: 'treasure 1', denomination: 'pp', quantity: 10, value: 1 }),
            createTreasure({ id: 'treasure 2', denomination: 'gp', quantity: 9, value: 1 }),
            { type: 'armor', _id: 'armor', data: {} } as any as ItemData,
        ];

        const {treasureIds} = findAllTreasure(items);
        treasureIds.sort();

        expect(treasureIds).toEqual(['treasure 1', 'treasure 2']);
    });
});