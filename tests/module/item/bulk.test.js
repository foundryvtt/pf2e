import {
    Bulk,
    calculateBulk,
    CombinedBulk,
    Item,
    itemsFromActorData,
    stacks
} from '../../../src/module/item/bulk';

describe('should calculate bulk', () => {
    test('empty inventory', () => {
        const bulk = calculateBulk([], stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0
            });
    });

    test('11 light items are 1 bulk and 1 light bulk', () => {
        const items = [new Item({
            bulk: new Bulk('light', 11)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 1
            });
    });

    test('light armor that is worn counts as 1 bulk', () => {
        const items = [new Item({
            isEquipped: true,
            equippedBulk: new Bulk('normal', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 1
            });
    });

    test('armor that is worn counts as 1 more bulk', () => {
        const items = [new Item({
            isEquipped: false,
            unequippedBulk: new Bulk('normal', 2),
            equippedBulk: new Bulk('normal', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2
            });
    });

    test('backpacks are light bulk when not worn', () => {
        const items = [new Item({
            unequippedBulk: new Bulk('light', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 0
            });
    });

    test('backpacks are light bulk when not worn', () => {
        const items = [new Item({
            isEquipped: true,
            unequippedBulk: new Bulk('light', 1),
            equippedBulk: new Bulk()
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0
            });
    });
    
    test('arrows that shoot bags of holding', () => {
        const items = [
            new Item({
                stackGroup: 'arrows',
                holdsItems: [
                    // bag of holding
                    new Item({
                        holdsItems: [
                            new Item({
                                bulk: new Bulk('normal', 15)
                            })
                        ],
                        negateBulk: new CombinedBulk(15),
                        bulk: new Bulk('light', 1)
                    })
                ]
            }),
            new Item({
                stackGroup: 'arrows',
                quantity: 9
            })
        ];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 2,
                normal: 0,
            });
    });

    test('backpacks negate bulk', () => {
        const items = [
            new Item({
                holdsItems: [
                    new Item({
                        bulk: new Bulk('normal', 1)
                    }),
                    new Item({
                        stackGroup: 'arrows',
                        quantity: 10
                    }),
                    new Item({
                        quantity: 9,
                        bulk: new Bulk('light', 1)
                    })
                ],
                negateBulk: new CombinedBulk(2),
                bulk: new Bulk('normal', 1)
            }),
            new Item({
                stackGroup: 'arrows',
                quantity: 9
            })
        ];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 1,
            });
    });

    test('should convert an inventory', () => {
        const actorData = {
            data: {
                currency: {
                    pp: {
                        value: 4
                    },
                    gp: {
                        value: 5
                    }
                },
            },
            items: [
                {
                    type: 'spell'
                },
                {
                    type: 'armor',
                    data: {
                        quantity: {
                            value: 1
                        },
                        equipped: {
                            value: false
                        },
                        weight: {
                            value: 'lala'
                        }
                    }
                },
                {
                    type: 'armor',
                    data: {
                        quantity: {
                            value: 1
                        },
                        equipped: {
                            value: true
                        },
                        weight: {
                            value: 'L'
                        }
                    }
                },
                {
                    type: 'weapon',
                    data: {
                        quantity: {
                            value: 2
                        },
                        weight: {
                            value: '1'
                        }
                    },
                }
            ]
        };
        const items = itemsFromActorData(actorData);

        expect(items.length)
            .toBe(4);

        const unequippedArmor = items[0];
        expect(unequippedArmor.quantity)
            .toBe(1);
        expect(unequippedArmor.isEquipped)
            .toBe(false);
        expect(unequippedArmor.bulk)
            .toEqual({
                type: 'negligible',
                value: 0
            });

        const equippedArmor = items[1];
        expect(equippedArmor.quantity)
            .toBe(1);
        expect(equippedArmor.isEquipped)
            .toBe(true);
        expect(equippedArmor.bulk)
            .toEqual({
                type: 'light',
                value: 1
            });

        const weapon = items[2];
        expect(weapon.quantity)
            .toBe(2);
        expect(weapon.isEquipped)
            .toBe(false);
        expect(weapon.bulk)
            .toEqual({
                type: 'normal',
                value: 1
            });

        const coins = items[3];
        expect(coins.stackGroup)
            .toBe('coins');
        expect(coins.quantity)
            .toBe(9);
    });
});
