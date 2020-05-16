import {calculateWealth} from '../../../src/module/item/currency.js';

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

    test('sums up currency', () => {
        const items = [
            {
                type: "no currency type",
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
                type: "currency",
            },
            {
                type: "currency",
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
                type: "currency",
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
                type: "currency",
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
                type: "currency",
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
                type: "currency",
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
                type: "currency",
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
                type: "currency",
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
                type: "currency",
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
});