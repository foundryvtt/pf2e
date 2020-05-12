import {
    ItemBulk,
    calculateBulk,
    CombinedBulk,
    ContainerOrItem,
    itemsFromActorData,
    stacks
} from '../../../src/module/item/itemBulk';

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
        const items = [new ContainerOrItem({
            bulk: new ItemBulk('light', 11)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 1
            });
    });

    test('light armor that is worn counts as 1 bulk', () => {
        const items = [new ContainerOrItem({
            isEquipped: true,
            equippedBulk: new ItemBulk('normal', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 1
            });
    });

    test('armor that is worn counts as 1 more bulk', () => {
        const items = [new ContainerOrItem({
            isEquipped: false,
            unequippedBulk: new ItemBulk('normal', 2),
            equippedBulk: new ItemBulk('normal', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2
            });
    });

    test('backpacks are light bulk when not worn', () => {
        const items = [new ContainerOrItem({
            unequippedBulk: new ItemBulk('light', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 0
            });
    });

    test('backpacks are light bulk when not worn', () => {
        const items = [new ContainerOrItem({
            isEquipped: true,
            unequippedBulk: new ItemBulk('light', 1),
            equippedBulk: new ItemBulk()
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
            new ContainerOrItem({
                stackGroup: 'arrows',
                holdsItems: [
                    // bag of holding
                    new ContainerOrItem({
                        holdsItems: [
                            new ContainerOrItem({
                                bulk: new ItemBulk('normal', 15)
                            })
                        ],
                        negateBulk: new CombinedBulk(15),
                        bulk: new ItemBulk('light', 1)
                    })
                ]
            }),
            new ContainerOrItem({
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
            new ContainerOrItem({
                holdsItems: [
                    new ContainerOrItem({
                        bulk: new ItemBulk('normal', 1)
                    }),
                    new ContainerOrItem({
                        stackGroup: 'arrows',
                        quantity: 10
                    }),
                    new ContainerOrItem({
                        quantity: 9,
                        bulk: new ItemBulk('light', 1)
                    })
                ],
                negateBulk: new CombinedBulk(2),
                bulk: new ItemBulk('normal', 1)
            }),
            new ContainerOrItem({
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

    test('handle string and integer weight values :(', () => {
        const actorData = {
            items: [
                {
                    type: 'armor',
                    data: {
                        weight: {
                            value: 'L'
                        }
                    }
                },
                {
                    type: 'armor',
                    data: {
                        weight: {
                            value: '1'
                        }
                    }
                },
                {
                    type: 'armor',
                    data: {
                        weight: {
                            value: 0
                        }
                    }
                },
                {
                    type: 'armor',
                },
            ]
        };
        const items = itemsFromActorData(actorData);

        expect(items.length)
            .toBe(5);

        const lightItem = items[0];
        expect(lightItem.bulk)
            .toEqual({
                type: 'light',
                value: 1
            });

        const weightless = items[1];
        expect(weightless.bulk)
            .toEqual({
                type: 'normal',
                value: 1
            });

        const bulkItem = items[2];
        expect(bulkItem.bulk)
            .toEqual({
                type: 'negligible',
                value: 0
            });

        const undefinedWeightItem = items[3];
        expect(undefinedWeightItem.bulk)
            .toEqual({
                type: 'negligible',
                value: 0
            });
    });
});
