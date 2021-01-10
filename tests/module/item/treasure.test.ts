import {
    addCoins,
    attemptToRemoveCoinsByValue,
    calculateValueOfCurrency,
    calculateTotalWealth,
    calculateWealth,
    sellAllTreasure,
} from '../../../src/module/item/treasure';

describe('should calculate wealth based on inventory', () => {
    test('empty inventory', () => {
        const items = [];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0,
        });
    });

    test('sums up treasure', () => {
        const items = [
            {
                _id: 'ignore',
                type: 'no treasure type',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 1,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {},
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'pp',
                    },
                    quantity: {
                        value: 10,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 9,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'sp',
                    },
                    quantity: {
                        value: 8,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'cp',
                    },
                    quantity: {
                        value: 7,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
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
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'pp',
                    },
                    quantity: {
                        value: 10,
                    },
                    value: {
                        value: 2,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 9,
                    },
                    value: {
                        value: 3,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'sp',
                    },
                    quantity: {
                        value: 8,
                    },
                    value: {
                        value: 4,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'cp',
                    },
                    quantity: {
                        value: 7,
                    },
                    value: {
                        value: 5,
                    },
                },
            },
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
                {
                    type: 'treasure',
                    _id: '1',
                    data: {
                        denomination: {
                            value: 'gp',
                        },
                        quantity: {
                            value: 7,
                        },
                        value: {
                            value: 5,
                        },
                        stackGroup: {
                            value: 'coins',
                        },
                    },
                },
                {
                    type: 'treasure',
                    _id: '2',
                    data: {
                        denomination: {
                            value: 'gp',
                        },
                        quantity: {
                            value: 7,
                        },
                        value: {
                            value: 1,
                        },
                        stackGroup: {
                            value: 'coins',
                        },
                    },
                },
                // ignored becase not added
                {
                    type: 'treasure',
                    _id: '3',
                    data: {
                        denomination: {
                            value: 'sp',
                        },
                        quantity: {
                            value: 6,
                        },
                        value: {
                            value: 1,
                        },
                        stackGroup: {
                            value: 'coins',
                        },
                    },
                },
                // ignored becase in a container
                {
                    type: 'treasure',
                    _id: '4',
                    data: {
                        denomination: {
                            value: 'cp',
                        },
                        quantity: {
                            value: 6,
                        },
                        value: {
                            value: 1,
                        },
                        stackGroup: {
                            value: 'coins',
                        },
                        containerId: {
                            value: 'yo',
                        },
                    },
                },
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

        expect(itemIdAndQuantity.size).toBe(1);
        expect(itemIdAndQuantity.has('2')).toBe(true);
        expect(itemIdAndQuantity.get('2')).toBe(6);

        expect(compendiumIdAndQuantity.size).toBe(2);
        expect(compendiumIdAndQuantity.has('JuNPeK5Qm1w6wpb4')).toBe(true);
        expect(compendiumIdAndQuantity.get('JuNPeK5Qm1w6wpb4')).toBe(3);
        expect(compendiumIdAndQuantity.has('lzJ8AVhRcbFul5fh')).toBe(true);
        expect(compendiumIdAndQuantity.get('lzJ8AVhRcbFul5fh')).toBe(4);
    });

    test('sell ignores coins', () => {
        const value = sellAllTreasure([
            {
                type: 'treasure',
                _id: '1',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 7,
                    },
                    value: {
                        value: 5,
                    },
                    stackGroup: {
                        value: 'coins',
                    },
                },
            },
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
            {
                _id: 'ignore',
                type: 'no treasure type',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 1,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {},
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'pp',
                    },
                    quantity: {
                        value: 10,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 9,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'sp',
                    },
                    quantity: {
                        value: 8,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                _id: 'ignore',
                type: 'treasure',
                data: {
                    denomination: {
                        value: 'cp',
                    },
                    quantity: {
                        value: 7,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
        ];

        const { coins } = sellAllTreasure(items);
        const wealth = calculateWealth(items);

        expect(coins).toEqual(wealth);
    });

    test('sell only finds treasure', () => {
        const items = [
            {
                type: 'weapon',
                _id: 'weapon',
                data: {},
            },
            {
                type: 'treasure',
                _id: 'treasure 1',
                data: {
                    denomination: {
                        value: 'pp',
                    },
                    quantity: {
                        value: 10,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                type: 'treasure',
                _id: 'treasure 2',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 9,
                    },
                    value: {
                        value: 1,
                    },
                },
            },
            {
                type: 'armor',
                _id: 'armor',
                data: {},
            },
        ];

        const { treasureIds } = sellAllTreasure(items);
        treasureIds.sort();

        expect(treasureIds).toEqual(['treasure 1', 'treasure 2']);
    });

    test('calculateTotalWealth correctly combines all item types', () => {
        const items = [
            {
                type: 'weapon',
                _id: 'weapon',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '3,000 gp' } },
            },
            {
                type: 'armor',
                _id: 'armor',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '30 pp' } },
            },
            {
                type: 'equipment',
                _id: 'equipment',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '3 cp' } },
            },
            {
                type: 'consumable',
                _id: 'consumable',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '30 sp' } },
            },
            {
                type: 'treasure',
                _id: 'treasure',
                data: { denomination: { value: 'sp' }, quantity: { value: 2 }, value: { value: 2 } },
            },
            {
                type: 'backpack',
                _id: 'backpack',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '3 gp' } },
            },
        ];
        const wealth = calculateTotalWealth(items);
        expect(wealth).toEqual({ pp: 30, gp: 3003, sp: 34, cp: 3 });
    });

    test('attemptToRemoveCoinsByValue resolves to false if not enough coins are available and makes no changes', async () => {
        const actor = {
            data: {
                items: [
                    {
                        type: 'treasure',
                        _id: '1',
                        data: {
                            denomination: {
                                value: 'gp',
                            },
                            quantity: {
                                value: 7,
                            },
                            value: {
                                value: 1,
                            },
                            stackGroup: {
                                value: 'coins',
                            },
                        },
                    },
                    {
                        type: 'treasure',
                        _id: '2',
                        data: {
                            denomination: {
                                value: 'gp',
                            },
                            quantity: {
                                value: 9,
                            },
                            value: {
                                value: 1,
                            },
                            stackGroup: {
                                value: 'coins',
                            },
                        },
                    },
                ],
            },
        };
        expect(await attemptToRemoveCoinsByValue({ actor, coinsToRemove: { pp: 0, gp: 18, sp: 0, cp: 0 } })).toEqual(
            false,
        );
        expect(calculateValueOfCurrency(actor.data.items)).toEqual({ pp: 0, gp: 16, sp: 0, cp: 0 });
    });

    test('attemptToRemoveCoinsByValue resolves to true if sufficient coins are available after updating coin counts', async () => {
        const updateFunction = jest.fn();
        const actor = {
            getOwnedItem(id) {
                return this.data.items.find((item) => item._id === id);
            },
            deleteEmbeddedEntity: jest.fn(),
            data: {
                items: [
                    {
                        type: 'treasure',
                        _id: '1',
                        data: {
                            denomination: {
                                value: 'gp',
                            },
                            quantity: {
                                value: 7,
                            },
                            value: {
                                value: 1,
                            },
                            stackGroup: {
                                value: 'coins',
                            },
                        },
                        update: updateFunction,
                    },
                    {
                        type: 'treasure',
                        _id: '2',
                        data: {
                            denomination: {
                                value: 'gp',
                            },
                            quantity: {
                                value: 9,
                            },
                            value: {
                                value: 1,
                            },
                            stackGroup: {
                                value: 'coins',
                            },
                        },
                        update: updateFunction,
                    },
                    {
                        type: 'treasure',
                        _id: '3',
                        data: {
                            denomination: {
                                value: 'pp',
                            },
                            quantity: {
                                value: 9,
                            },
                            value: {
                                value: 1,
                            },
                            stackGroup: {
                                value: 'coins',
                            },
                        },
                        update: updateFunction,
                    },
                ],
            },
        };
        expect(await attemptToRemoveCoinsByValue({ actor, coinsToRemove: { pp: 0, gp: 98, sp: 0, cp: 0 } })).toEqual(
            true,
        );
        expect(updateFunction.mock.calls.length).toEqual(1);
        expect(updateFunction.mock.calls[0][0]).toEqual({ 'data.quantity.value': 8 });
        expect(actor.deleteEmbeddedEntity.mock.calls.length).toEqual(2);
        expect(actor.deleteEmbeddedEntity.mock.calls[0][0]).toEqual('OwnedItem');
        expect(actor.deleteEmbeddedEntity.mock.calls[0][1]).toEqual(['3']);
        expect(actor.deleteEmbeddedEntity.mock.calls[1][0]).toEqual('OwnedItem');
        expect(actor.deleteEmbeddedEntity.mock.calls[1][1]).toEqual(['1']);
    });

    test('attemptToRemoveCoinsByValue breaks coins when needed', async () => {
        const updateFunction = jest.fn();
        const actor = {
            getOwnedItem(id) {
                return this.data.items.find((item) => item._id === id);
            },
            deleteEmbeddedEntity: jest.fn(),
            createOwnedItem: jest.fn(),
            data: {
                items: [
                    {
                        type: 'treasure',
                        _id: '3',
                        data: {
                            denomination: {
                                value: 'pp',
                            },
                            quantity: {
                                value: 9,
                            },
                            value: {
                                value: 1,
                            },
                            stackGroup: {
                                value: 'coins',
                            },
                        },
                        update: updateFunction,
                    },
                ],
            },
        };
        expect(await attemptToRemoveCoinsByValue({ actor, coinsToRemove: { pp: 1, gp: 3, sp: 2, cp: 1 } })).toEqual(
            true,
        );
        expect(updateFunction.mock.calls.length).toEqual(1);
        expect(updateFunction.mock.calls[0][0]).toEqual({ 'data.quantity.value': 7 });
        expect(actor.createOwnedItem.mock.calls.length).toEqual(3);
        expect(actor.createOwnedItem.mock.calls[0][0]).toEqual({ data: { quantity: { value: 10 }, type: 'gp' } });
        expect(actor.createOwnedItem.mock.calls[1][0]).toEqual({ data: { quantity: { value: 10 }, type: 'cp' } });
        expect(actor.createOwnedItem.mock.calls[2][0]).toEqual({ data: { quantity: { value: 10 }, type: 'sp' } });
    });
});
