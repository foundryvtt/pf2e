import {
    calculateBulk,
    Bulk,
    ContainerOrItem,
    itemsFromActorData,
    calculateCarriedArmorBulk,
    stacks
} from '../../../src/module/item/bulk.js';

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
            bulk: new Bulk({ light: 11 })
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
            equippedBulk: new Bulk({ normal: 1 })
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
            unequippedBulk: new Bulk({ normal: 2 }),
            equippedBulk: new Bulk({ normal: 1 })
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
            isEquipped: false,
            unequippedBulk: new Bulk({ light: 1 }),
            equippedBulk: new Bulk()
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 0
            });
    });

    test('backpacks are negligible bulk when worn', () => {
        const items = [new ContainerOrItem({
            isEquipped: true,
            unequippedBulk: new Bulk({ light: 1 }),
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
            new ContainerOrItem({
                stackGroup: 'arrows',
                holdsItems: [
                    // bag of holding
                    new ContainerOrItem({
                        holdsItems: [
                            new ContainerOrItem({
                                bulk: new Bulk({ normal: 15 })
                            })
                        ],
                        negateBulk: new Bulk({ normal: 15 }),
                        bulk: new Bulk({ light: 1 }),
                        extraDimensionalContainer: true
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

    test('worn backpack negate bulk', () => {
        const items = [
            // backpack
            new ContainerOrItem({
                holdsItems: [
                    new ContainerOrItem({
                        bulk: new Bulk({ normal: 1 })
                    }),
                    new ContainerOrItem({
                        stackGroup: 'arrows',
                        quantity: 10
                    }),
                    new ContainerOrItem({
                        quantity: 9,
                        bulk: new Bulk({ light: 1 })
                    })
                ],
                isEquipped: true,
                negateBulk: new Bulk({ normal: 2 }),
                bulk: new Bulk({ normal: 1 })
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

    test('unequipped backpack does not negate bulk', () => {
        const items = [
            // backpack
            new ContainerOrItem({
                holdsItems: [
                    new ContainerOrItem({
                        bulk: new Bulk({ normal: 1 })
                    }),
                ],
                isEquipped: false,
                negateBulk: new Bulk({ normal: 2 }),
                bulk: new Bulk({ normal: 1 })
            }),
        ];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2,
            });
    });

    test('nesting bag of holdings into backpacks reduces bulk', () => {
        const items = [
            // backpack
            new ContainerOrItem({
                holdsItems: [
                    // bag of holding
                    new ContainerOrItem({
                        bulk: new Bulk({ normal: 1 }),
                        extraDimensionalContainer: true,
                        holdsItems: [
                            // bag of holding
                            new ContainerOrItem({
                                bulk: new Bulk({ normal: 10 })
                            })
                        ],
                        negateBulk: new Bulk({ normal: 15 })
                    }),
                ],
                isEquipped: true,
                negateBulk: new Bulk({ normal: 2 }),
                equippedBulk: new Bulk()
            }),
        ];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0,
            });
    });

    test('nested extra dimensional containers dont reduce bulk', () => {
        const items = [
            // bag of holding
            new ContainerOrItem({
                bulk: new Bulk({ normal: 1 }),
                extraDimensionalContainer: true,
                holdsItems: [
                    // bag of holding
                    new ContainerOrItem({
                        bulk: new Bulk({ normal: 1 }),
                        holdsItems: [
                            new ContainerOrItem({
                                bulk: new Bulk({ normal: 25 })
                            })
                        ],
                        negateBulk: new Bulk({ normal: 15 }),
                        extraDimensionalContainer: true
                    })
                ],
                negateBulk: new Bulk({ normal: 15 })
            }),
        ];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 12,
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
                        traits: {
                            value: ['extradimensional']
                        },
                        quantity: {
                            value: 1
                        },
                        equipped: {
                            value: false
                        },
                        weight: {
                            value: 'lala'
                        },
                        equippedBulk: {
                            value: 'l'
                        },
                        unequippedBulk: {
                            value: '1'
                        },
                        negateBulk: {
                            value: '2'
                        },
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
                },
                {
                    type: 'weapon',
                    data: {
                        stackGroup: {
                            value: 'arrows'
                        }
                    },
                }
            ]
        };
        const items = itemsFromActorData(actorData);

        expect(items.length)
            .toBe(5);

        const unequippedArmor = items[0];
        expect(unequippedArmor.quantity)
            .toBe(1);
        expect(unequippedArmor.isEquipped)
            .toBe(false);
        expect(unequippedArmor.extraDimensionalContainer)
            .toBe(true);
        expect(unequippedArmor.equippedBulk)
            .toEqual({
                normal: 0,
                light: 1
            });
        expect(unequippedArmor.unequippedBulk)
            .toEqual({
                normal: 1,
                light: 0
            });
        expect(unequippedArmor.negateBulk)
            .toEqual({
                normal: 2,
                light: 0
            });
        expect(unequippedArmor.bulk)
            .toEqual({
                normal: 0,
                light: 0
            });

        const equippedArmor = items[1];
        expect(equippedArmor.quantity)
            .toBe(1);
        expect(equippedArmor.extraDimensionalContainer)
            .toBe(false);
        expect(equippedArmor.isEquipped)
            .toBe(true);
        expect(equippedArmor.bulk)
            .toEqual({
                light: 1,
                normal: 0
            });

        const weapon = items[2];
        expect(weapon.quantity)
            .toBe(2);
        expect(weapon.isEquipped)
            .toBe(false);
        expect(weapon.bulk)
            .toEqual({
                normal: 1,
                light: 0,
            });

        expect(items[3].stackGroup)
            .toBe('arrows');

        const coins = items[4];
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
                light: 1,
                normal: 0
            });

        const weightless = items[1];
        expect(weightless.bulk)
            .toEqual({
                normal: 1,
                light: 0,
            });

        const bulkItem = items[2];
        expect(bulkItem.bulk)
            .toEqual({
                normal: 0,
                light: 0
            });

        const undefinedWeightItem = items[3];
        expect(undefinedWeightItem.bulk)
            .toEqual({
                normal: 0,
                light: 0
            });
    });

    test('should nest items into containers', () => {
        const actorData = {
            items: [
                {
                    _id: 'test1',
                    type: 'armor',
                },
                {
                    type: 'armor',
                    _id: 'test2',
                    data: {
                        containerId: { value: 'test1' }
                    }
                },
                {
                    type: 'armor',
                    _id: 'test3',
                    data: {
                        containerId: { value: 'test2' }
                    }
                },
                {
                    type: 'armor',
                    _id: 'test4',
                    data: {
                        containerId: { value: 'test2' }
                    }
                },
                {
                    type: 'armor',
                    _id: 'test5',
                },
            ]
        };
        const items = itemsFromActorData(actorData);

        expect(items.length)
            .toBe(3);
    });

    test('should not nest items that have an containerId that does not exist', () => {
        const actorData = {
            items: [
                {
                    type: 'armor',
                    _id: 'test1',
                    data: {
                        containerId: { value: 'test2' }
                    }
                },
            ]
        };
        const items = itemsFromActorData(actorData);

        expect(items.length)
            .toBe(2);
    });

    test('should calculate carried bulk for armors', () => {
        expect(calculateCarriedArmorBulk('l'))
            .toBe('1');
        expect(calculateCarriedArmorBulk('L'))
            .toBe('1');
        expect(calculateCarriedArmorBulk(''))
            .toBe('-');
        expect(calculateCarriedArmorBulk(null))
            .toBe('-');
        expect(calculateCarriedArmorBulk(undefined))
            .toBe('-');
        expect(calculateCarriedArmorBulk('0'))
            .toBe('-');
        expect(calculateCarriedArmorBulk('1'))
            .toBe('2');
    });

    test('should implement various bulk calculation', () => {
        expect(new Bulk({normal: 3, light: 2}).plus(new Bulk({normal: 4, light: 1})))
            .toEqual({
                normal:7,
                light: 3,
            });
        expect(new Bulk({normal: 2, light: 1}).minus(new Bulk({normal: 4, light: 4})))
            .toEqual({
                normal:0,
                light: 0,
            });
        expect(new Bulk({normal: 2, light: 4}).minus(new Bulk({normal: 2, light: 1})))
            .toEqual({
                normal:0,
                light: 3,
            });
        expect(new Bulk({normal: 2, light: 0}).minus(new Bulk({normal: 0, light: 1})))
            .toEqual({
                normal:1,
                light: 9,
            });
        expect(new Bulk({normal: 4, light: 3}).times(3))
            .toEqual({
                normal: 12,
                light: 9,
            });
        expect(new Bulk({normal: 0, light: 1}).isSmallerThan(new Bulk({normal: 1, light: 0})))
            .toBe(true);
        expect(new Bulk({normal: 1, light: 0}).isSmallerThan(new Bulk({normal: 1, light: 0})))
            .toBe(false);
        expect(new Bulk({normal: 1, light: 0}).isEqualTo(new Bulk({normal: 1, light: 0})))
            .toBe(true);
        expect(new Bulk({normal: 1, light: 0}).isBiggerThan(new Bulk({normal: 0, light: 1})))
            .toBe(true);
        expect(new Bulk({normal: 1, light: 0}).isBiggerThan(new Bulk({normal: 2, light: 0})))
            .toBe(false);
    });
        
    test('should respect configs to ignore coin bulk', () => {
        const items = [
            new ContainerOrItem({
                stackGroup: 'coins',
                quantity: 100000
            })
        ];
        let bulk = calculateBulk(items, stacks, false);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 100,
            });

        bulk = calculateBulk(items, stacks, false, {ignoreCoinBulk: true});
        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0,
            });
    });
});
