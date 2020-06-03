import {calculateWealth, addCoins, sellAllTreasure} from '../../../src/module/item/treasure.js';

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
                // ignored because of only value 1 is taken
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
                        },
                        stackGroup: {
                            value: 'coins'
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
                        },
                        stackGroup: {
                            value: 'coins'
                        }
                    }
                },
                // ignored becase not added
                {
                    type: "treasure",
                    _id: "3",
                    data: {
                        denomination: {
                            value: "sp"
                        },
                        quantity: {
                            value: 6
                        },
                        value: {
                            value: 1
                        },
                        stackGroup: {
                            value: 'coins'
                        }
                    }
                },
                // ignored becase in a container
                {
                    type: "treasure",
                    _id: "4",
                    data: {
                        denomination: {
                            value: "cp"
                        },
                        quantity: {
                            value: 6
                        },
                        value: {
                            value: 1
                        },
                        stackGroup: {
                            value: 'coins'
                        },
                        containerId: {
                            value: 'yo'
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
                cp: 4,
            }
        });

        expect(itemIdAndQuantity.size)
            .toBe(1);
        expect(itemIdAndQuantity.has('2'))
            .toBe(true);
        expect(itemIdAndQuantity.get('2'))
            .toBe(6);

        expect(compendiumIdAndQuantity.size)
            .toBe(2)
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
        const value = sellAllTreasure([
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
                    },
                    stackGroup: {
                        value: 'coins'
                    }
                }
            },
        ]);

        expect(value).toEqual({
            treasureIds: [],
            coins: {
                pp: 0,
                gp: 0,
                sp: 0,
                cp: 0
            }
        });
    });

    test('sell without coins has the same value as calculateWealth', () => {
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

        const {coins} = sellAllTreasure(items);
        const wealth = calculateWealth(items);

        expect(coins).toEqual(wealth);
    });

    test('sell only finds treasure', () => {
        const items = [
            {
                type: "weapon",
                _id: "weapon",
            },
            {
                type: "treasure",
                _id: "treasure 1",
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
                _id: "treasure 2",
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
                type: "armor",
                _id: "armor"
            },
        ];

        const {treasureIds} = sellAllTreasure(items);
        treasureIds.sort();

        expect(treasureIds).toEqual(['treasure 1', 'treasure 2']);
    });
});