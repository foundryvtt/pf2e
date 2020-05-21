import {calculateWealth, addCoins} from '../../../src/module/item/treasure.js';

describe('should calculate wealth based on inventory', () => {
    test('empty inventory', () => {
        const items = [];

        const result = calculateWealth(items);
        expect(result)
            .toEqual({
                pp: 0,
                gp: 0,
                sp: 0,
                cp: 0
            });
    });

    test('sums up treasure', () => {
        const items = [
            {
                type: "no treasure type",
                data: {
                    denomination: {
                        value: "gp"
                    },
                    quantity: {
                        value: 1
                    },
                    value: {
                        value: 1
                    }
                }
            },
            {
                type: "treasure",
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "pp"
                    },
                    quantity: {
                        value: 10
                    },
                    value: {
                        value: 1
                    }
                }
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "gp"
                    },
                    quantity: {
                        value: 9
                    },
                    value: {
                        value: 1
                    }
                }
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "sp"
                    },
                    quantity: {
                        value: 8
                    },
                    value: {
                        value: 1
                    }
                }
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "cp"
                    },
                    quantity: {
                        value: 7
                    },
                    value: {
                        value: 1
                    }
                }
            },
        ];

        const result = calculateWealth(items);
        expect(result)
            .toEqual({
                pp: 10,
                gp: 9,
                sp: 8,
                cp: 7
            });
    });

    test('adjusts value', () => {
        const items = [
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "pp"
                    },
                    quantity: {
                        value: 10
                    },
                    value: {
                        value: 2
                    }
                }
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "gp"
                    },
                    quantity: {
                        value: 9
                    },
                    value: {
                        value: 3
                    }
                }
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "sp"
                    },
                    quantity: {
                        value: 8
                    },
                    value: {
                        value: 4
                    }
                }
            },
            {
                type: "treasure",
                data: {
                    denomination: {
                        value: "cp"
                    },
                    quantity: {
                        value: 7
                    },
                    value: {
                        value: 5
                    }
                }
            },
        ];

        const result = calculateWealth(items);
        expect(result)
            .toEqual({
                pp: 20,
                gp: 27,
                sp: 32,
                cp: 35
            });
    });
    
    test('should be able to add coins to an existing stack', async () => {
        const compendiumIdAndQuantity = new Map();
        const itemIdAndQuantity = new Map();
        await addCoins({
            items: [
                // ignored because of value
                {
                    type: "treasure",
                    _id: "1",
                    data: {
                        denomination: {
                            value: "gp"
                        },
                        quantity: {
                            value: 7
                        },
                        value: {
                            value: 5
                        }
                    }
                },
                {
                    type: "treasure",
                    _id: "2",
                    data: {
                        denomination: {
                            value: "gp"
                        },
                        quantity: {
                            value: 7
                        },
                        value: {
                            value: 1
                        }
                    }
                },
                // ignored becase not positive
                {
                    type: "treasure",
                    _id: "3",
                    data: {
                        denomination: {
                            value: "cp"
                        },
                        quantity: {
                            value: 6
                        },
                        value: {
                            value: 1
                        }
                    }
                },
            ], 
            combineStacks: true, 
            addFromCompendium: (compendiumId, quantity) => compendiumIdAndQuantity.set(compendiumId, quantity), 
            updateItemQuantity: (item, quantity) => itemIdAndQuantity.set(item._id, quantity),
            coins: {
                pp: 3,
                gp: 6,
            }
        });

        expect(itemIdAndQuantity.size)
            .toBe(1);
        expect(itemIdAndQuantity.has('2'))
            .toBe(true);
        expect(itemIdAndQuantity.get('2'))
            .toBe(6);
        
        expect(compendiumIdAndQuantity.size)
            .toBe(1)
        expect(compendiumIdAndQuantity.has('JuNPeK5Qm1w6wpb4'))
            .toBe(true);
        expect(compendiumIdAndQuantity.get('JuNPeK5Qm1w6wpb4'))
            .toBe(3);
    });
});