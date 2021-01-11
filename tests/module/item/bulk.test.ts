import {
    calculateBulk,
    Bulk,
    BulkItem,
    toBulkItems,
    calculateCarriedArmorBulk,
    stacks,
    weightToBulk,
    convertBulkToSize,
} from '../../../src/module/item/bulk';
import { PhysicalItemData,
         ItemDescriptionData,
         BaseItemDataPF2e } from 'src/module/item/dataDefinitions';

type WithTraits = BaseItemDataPF2e<ItemDescriptionData & { traits: { value: string[] }}>
function createItem({
                        id = 'ignore',
                        weight = undefined,
                        unequippedBulk = undefined,
                        equippedBulk = undefined,
                        negateBulk = '',
                        bulkCapacity = '',
                        containerId = '',
                        equipped = false,
                        type = 'equipment',
                        traits = [],
                        quantity = 1,
                        stackGroup = undefined
                    }): PhysicalItemData & WithTraits {
    return {
        _id: id,
        type: type,
        data: {
            traits: {
                value: traits 
            },
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
            unequippedBulk: {
                value: unequippedBulk
            },
            quantity: {
                value: quantity,
            },
            stackGroup: {
                value: stackGroup
            }
        },
    } as PhysicalItemData & WithTraits;
}

describe('should calculate bulk', () => {
    test('empty inventory', () => {
        const [bulk] = calculateBulk([], stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0,
            });
    });

    test('11 light items are 1 bulk and 1 light bulk', () => {
        const items = [new BulkItem({
            bulk: new Bulk({light: 11}),
        })];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 1,
            });
    });

    test('item quantity multiplies bulk', () => {
        const items = [new BulkItem({
            bulk: new Bulk({light: 1}),
            quantity: 11,
        })];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 1,
            });
    });

    test('light armor that is worn counts as 1 bulk', () => {
        const items = [new BulkItem({
            isEquipped: true,
            equippedBulk: new Bulk({normal: 1}),
        })];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 1,
            });
    });

    test('armor that is worn counts as 1 more bulk', () => {
        const items = [new BulkItem({
            isEquipped: false,
            unequippedBulk: new Bulk({normal: 2}),
            equippedBulk: new Bulk({normal: 1}),
        })];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2,
            });
    });

    test('backpacks are light bulk when not worn', () => {
        const items = [new BulkItem({
            isEquipped: false,
            unequippedBulk: new Bulk({light: 1}),
            equippedBulk: new Bulk(),
        })];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 0,
            });
    });

    test('backpacks are negligible bulk when worn', () => {
        const items = [new BulkItem({
            isEquipped: true,
            unequippedBulk: new Bulk({light: 1}),
            equippedBulk: new Bulk(),
        })];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0,
            });
    });

    test('arrows that shoot bags of holding', () => {
        const items = [
            new BulkItem({
                stackGroup: 'arrows',
                holdsItems: [
                    // bag of holding
                    new BulkItem({
                        holdsItems: [
                            new BulkItem({
                                bulk: new Bulk({normal: 15}),
                            }),
                        ],
                        negateBulk: new Bulk({normal: 15}),
                        bulk: new Bulk({light: 1}),
                        extraDimensionalContainer: true,
                    }),
                ],
            }),
            new BulkItem({
                stackGroup: 'arrows',
                quantity: 9,
            }),
        ];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 2,
                normal: 0,
            });
    });

    test('worn backpack negate bulk', () => {
        const items = [
            // backpack
            new BulkItem({
                holdsItems: [
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                    }),
                    new BulkItem({
                        stackGroup: 'arrows',
                        quantity: 10,
                    }),
                    new BulkItem({
                        quantity: 9,
                        bulk: new Bulk({light: 1}),
                    }),
                ],
                isEquipped: true,
                negateBulk: new Bulk({normal: 2}),
                bulk: new Bulk({normal: 1}),
            }),
            new BulkItem({
                stackGroup: 'arrows',
                quantity: 9,
            }),
        ];
        const [bulk, overflow] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 1,
            });
        expect(overflow)
            .toEqual({arrows: 9});
    });

    test('unequipped backpack does not negate bulk', () => {
        const items = [
            // backpack
            new BulkItem({
                holdsItems: [
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                    }),
                ],
                isEquipped: false,
                negateBulk: new Bulk({normal: 2}),
                bulk: new Bulk({normal: 1}),
            }),
        ];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2,
            });
    });

    test('nesting bag of holdings into backpacks reduces bulk', () => {
        const items = [
            // backpack
            new BulkItem({
                holdsItems: [
                    // bag of holding
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                        extraDimensionalContainer: true,
                        holdsItems: [
                            // bag of holding
                            new BulkItem({
                                bulk: new Bulk({normal: 10}),
                            }),
                        ],
                        negateBulk: new Bulk({normal: 15}),
                    }),
                ],
                isEquipped: true,
                negateBulk: new Bulk({normal: 2}),
                equippedBulk: new Bulk(),
            }),
        ];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0,
            });
    });

    test('nested extra dimensional containers dont reduce bulk', () => {
        const items = [
            // bag of holding
            new BulkItem({
                bulk: new Bulk({normal: 1}),
                extraDimensionalContainer: true,
                holdsItems: [
                    // bag of holding
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                        holdsItems: [
                            new BulkItem({
                                bulk: new Bulk({normal: 25}),
                            }),
                        ],
                        negateBulk: new Bulk({normal: 15}),
                        extraDimensionalContainer: true,
                    }),
                ],
                negateBulk: new Bulk({normal: 15}),
            }),
        ];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 12,
            });
    });

    test('nested stacks pass overflow up', () => {
        const items = [
            // backpack
            new BulkItem({
                bulk: new Bulk({normal: 1}),
                holdsItems: [
                    // backpack containing 999 coins
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                        holdsItems: [
                            // partial stack gets passed up
                            new BulkItem({
                                stackGroup: 'coins',
                                quantity: 997,
                            }),
                        ],
                        negateBulk: new Bulk({normal: 2}),
                    }),
                    // this container now holds 999 coins
                    new BulkItem({
                        quantity: 2,
                        stackGroup: 'coins',
                    }),
                ],
                negateBulk: new Bulk({normal: 2}),
                isEquipped: true,
            }),
            // pouch
            new BulkItem({
                holdsItems: [
                    // the last coin from this container should add to 1 bulk
                    new BulkItem({
                        quantity: 1,
                        stackGroup: 'coins',
                    }),
                ],
            }),
        ];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2,
            });
    });

    test('nested stacks do not pass overflow up if disabled', () => {
        const items = [
            // backpack
            new BulkItem({
                bulk: new Bulk({normal: 1}),
                holdsItems: [
                    // backpack containing 999 coins
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                        holdsItems: [
                            // partial stack gets passed up
                            new BulkItem({
                                stackGroup: 'coins',
                                quantity: 997,
                            }),
                        ],
                        negateBulk: new Bulk({normal: 2}),
                    }),
                    // this container now holds 999 coins
                    new BulkItem({
                        quantity: 2,
                        stackGroup: 'coins',
                    }),
                ],
                negateBulk: new Bulk({normal: 2}),
                isEquipped: true,
            }),
            // pouch
            new BulkItem({
                holdsItems: [
                    // the last coin from this container should add to 1 bulk
                    new BulkItem({
                        quantity: 1,
                        stackGroup: 'coins',
                    }),
                ],
            }),
        ];
        const [bulk] = calculateBulk(items, stacks, false, {
            ignoreContainerOverflow: true,
            ignoreCoinBulk: false,
        });

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 1,
            });
    });

    test('nested stacks doesnt pass overflow up if extradimensional', () => {
        const items = [
            // backpack
            new BulkItem({
                bulk: new Bulk({normal: 1}),
                holdsItems: [
                    // backpack containing 999 coins
                    new BulkItem({
                        bulk: new Bulk({normal: 1}),
                        holdsItems: [
                            // partial stack gets passed up
                            new BulkItem({
                                stackGroup: 'coins',
                                quantity: 997,
                            }),
                            // full stack gets absorbed
                            new BulkItem({
                                stackGroup: 'arrows',
                                quantity: 10,
                            }),
                        ],
                        extraDimensionalContainer: true,
                        negateBulk: new Bulk({normal: 2}),
                    }),
                    new BulkItem({
                        quantity: 2,
                        stackGroup: 'coins',
                    }),
                ],
                negateBulk: new Bulk({normal: 2}),
                isEquipped: true,
            }),
            // pouch
            new BulkItem({
                holdsItems: [
                    new BulkItem({
                        quantity: 1,
                        stackGroup: 'coins',
                    }),
                ],
                bulk: new Bulk({light: 1}),
            }),
        ];
        const [bulk] = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 1,
                normal: 1,
            });
    });

    test('should convert an inventory', () => {
        const rawItems = [
            createItem({
                type: 'armor',
                weight: 'lala',
                equippedBulk: 'l',
                unequippedBulk: '1',
                negateBulk: '2',
                traits: ['extradimensional']
            }),
            createItem({
                type: 'armor',
                equipped: true,
                weight: 'L'
            }),
            createItem({
                type: 'weapon',
                quantity: 2,
                weight: '1'
            }),
            createItem({
                type: 'weapon',
                stackGroup: 'arrows',
            }),
            createItem({
                type: 'treasure',
                quantity: 9,
                stackGroup: 'coins',
            }),
        ];
        const items = toBulkItems(rawItems);

        expect(items.length).toBe(5);

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
                light: 1,
            });
        expect(unequippedArmor.unequippedBulk)
            .toEqual({
                normal: 1,
                light: 0,
            });
        expect(unequippedArmor.negateBulk)
            .toEqual({
                normal: 2,
                light: 0,
            });
        expect(unequippedArmor.bulk)
            .toEqual({
                normal: 0,
                light: 0,
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
                normal: 0,
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
        const rawItems = [
            createItem({
                type: 'armor',
                weight: 'L'
            }),
            createItem({
                type: 'armor',
                weight: '1'
            }),
            createItem({
                type: 'armor',
                weight: '0'
            }),
            createItem({ type: 'armor' }),
            createItem({
                type: 'treasure',
                quantity: 9,
                stackGroup: 'coins'
            }),
        ];
        const items = toBulkItems(rawItems);

        expect(items.length)
            .toBe(5);

        const lightItem = items[0];
        expect(lightItem.bulk)
            .toEqual({
                light: 1,
                normal: 0,
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
                light: 0,
            });

        const undefinedWeightItem = items[3];
        expect(undefinedWeightItem.bulk)
            .toEqual({
                normal: 0,
                light: 0,
            });
    });

    test('should nest items into containers', () => {
        const rawItems = [
            createItem({ id: 'test1', type: 'armor' }),
            createItem({ id: 'test2', type: 'armor', containerId: 'test1' }),
            createItem({ id: 'test3', type: 'armor', containerId: 'test2' }),
            createItem({ id: 'test4', type: 'armor', containerId: 'test2' }),
            createItem({ id: 'test5', type: 'armor' })
        ];
        const items = toBulkItems(rawItems);

        expect(items.length).toBe(2);
    });

    test('should not nest items that have an containerId that does not exist', () => {
        const rawItems = [
            createItem({ id: 'test1', type: 'armor', containerId: 'test2' })
        ];
        const items = toBulkItems(rawItems);

        expect(items.length).toBe(1);
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
        expect(new Bulk({
            normal: 3,
            light: 2,
        }).plus(new Bulk({
            normal: 4,
            light: 1,
        })))
            .toEqual({
                normal: 7,
                light: 3,
            });
        expect(new Bulk({
            normal: 2,
            light: 1,
        }).minus(new Bulk({
            normal: 4,
            light: 4,
        })))
            .toEqual({
                normal: 0,
                light: 0,
            });
        expect(new Bulk({
            normal: 2,
            light: 4,
        }).minus(new Bulk({
            normal: 2,
            light: 1,
        })))
            .toEqual({
                normal: 0,
                light: 3,
            });
        expect(new Bulk({
            normal: 2,
            light: 0,
        }).minus(new Bulk({
            normal: 0,
            light: 1,
        })))
            .toEqual({
                normal: 1,
                light: 9,
            });
        expect(new Bulk({
            normal: 4,
            light: 3,
        }).times(3))
            .toEqual({
                normal: 12,
                light: 9,
            });
        expect(new Bulk({
            normal: 0,
            light: 1,
        }).isSmallerThan(new Bulk({
            normal: 1,
            light: 0,
        })))
            .toBe(true);
        expect(new Bulk({
            normal: 1,
            light: 0,
        }).isSmallerThan(new Bulk({
            normal: 1,
            light: 0,
        })))
            .toBe(false);
        expect(new Bulk({
            normal: 1,
            light: 0,
        }).isEqualTo(new Bulk({
            normal: 1,
            light: 0,
        })))
            .toBe(true);
        expect(new Bulk({
            normal: 1,
            light: 0,
        }).isBiggerThan(new Bulk({
            normal: 0,
            light: 1,
        })))
            .toBe(true);
        expect(new Bulk({
            normal: 1,
            light: 0,
        }).isBiggerThan(new Bulk({
            normal: 2,
            light: 0,
        })))
            .toBe(false);
    });

    test('should respect configs to ignore coin bulk', () => {
        const items = [
            new BulkItem({
                stackGroup: 'coins',
                quantity: 100000,
            }),
        ];
        let [bulk] = calculateBulk(items, stacks, false);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 100,
            });

        [bulk] = calculateBulk(items, stacks, false, {ignoreCoinBulk: true, ignoreContainerOverflow: false});
        expect(bulk)
            .toEqual({
                light: 0,
                normal: 0,
            });
    });

    test('should parse more complex weights', () => {
        expect(weightToBulk('2; l'))
            .toEqual({
                normal: 2,
                light: 1,
            });

        expect(weightToBulk('2; L'))
            .toEqual({
                normal: 2,
                light: 1,
            });

        expect(weightToBulk('2;3l'))
            .toEqual({
                normal: 2,
                light: 3,
            });

        expect(weightToBulk('2'))
            .toEqual({
                normal: 2,
                light: 0,
            });

        expect(weightToBulk('l'))
            .toEqual({
                normal: 0,
                light: 1,
            });

        expect(weightToBulk('2, 1l'))
            .toEqual(undefined);

        expect(weightToBulk('2, 1lL'))
            .toEqual(undefined);

        expect(weightToBulk('-'))
            .toEqual(undefined);

        expect(weightToBulk('2L'))
            .toEqual({
                normal: 0,
                light: 2,
            });

        expect(weightToBulk('3; 2L'))
            .toEqual({
                normal: 3,
                light: 2,
            });
    });
});

describe('Bulk conversions', () => {
    test('tiny bulk conversions', () => {
        // negligible is light bulk
        expect(convertBulkToSize(new Bulk({light: 0, normal: 0}), 'tiny'))
            .toEqual(new Bulk({
                light: 1,
                normal: 0,
            }));
        // everything else stays the same
        expect(convertBulkToSize(new Bulk({light: 1, normal: 1}), 'tiny'))
            .toEqual(new Bulk({
                light: 1,
                normal: 1,
            }));
    });
    
    test('normal and small bulk conversions', () => {
        expect(convertBulkToSize(new Bulk({light: 1, normal: 1}), 'sm'))
            .toEqual(new Bulk({
                light: 1,
                normal: 1,
            }));
        expect(convertBulkToSize(new Bulk({light: 1, normal: 1}), 'med'))
            .toEqual(new Bulk({
                light: 1,
                normal: 1,
            }));
    });
    
    test('large bulk conversions', () => {
        // light bulk is negligible
        expect(convertBulkToSize(new Bulk({light: 1, normal: 0}), 'lg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // normal bulk is light
        expect(convertBulkToSize(new Bulk({light: 0, normal: 1}), 'lg'))
            .toEqual(new Bulk({
                light: 1,
                normal: 0,
            }));
        // everything else stays the same
        expect(convertBulkToSize(new Bulk({light: 0, normal: 2}), 'lg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 2,
            }));
    });

    test('huge bulk conversions', () => {
        // 1 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 0, normal: 0}), 'huge'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 1 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 1, normal: 0}), 'huge'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 1 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 0, normal: 1}), 'huge'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 2 or lower is light bulk
        expect(convertBulkToSize(new Bulk({light: 0, normal: 2}), 'huge'))
            .toEqual(new Bulk({
                light: 1,
                normal: 0,
            }));
        // everything else stays the same
        expect(convertBulkToSize(new Bulk({light: 0, normal: 3}), 'huge'))
            .toEqual(new Bulk({
                light: 0,
                normal: 3,
            }));
    });

    test('gargantuan bulk conversions', () => {
        // 2 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 0, normal: 0}), 'grg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 2 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 1, normal: 0}), 'grg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 2 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 0, normal: 1}), 'grg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 2 or lower is negligible
        expect(convertBulkToSize(new Bulk({light: 0, normal: 2}), 'grg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 0,
            }));
        // 4 or lower is light bulk
        expect(convertBulkToSize(new Bulk({light: 0, normal: 3}), 'grg'))
            .toEqual(new Bulk({
                light: 1,
                normal: 0,
            }));
        // 4 or lower is light bulk
        expect(convertBulkToSize(new Bulk({light: 0, normal: 4}), 'grg'))
            .toEqual(new Bulk({
                light: 1,
                normal: 0,
            }));
        // everything else stays the same
        expect(convertBulkToSize(new Bulk({light: 0, normal: 5}), 'grg'))
            .toEqual(new Bulk({
                light: 0,
                normal: 5,
            }));
    });
});
