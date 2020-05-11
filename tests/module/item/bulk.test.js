import { Bulk, calculateBulk, CombinedBulk, Item, stacks } from '../../../src/module/item/bulk';

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
            isArmorButNotWorn: true,
            bulk: new Bulk('light', 1)
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
            isArmorButNotWorn: true,
            bulk: new Bulk('normal', 1)
        })];
        const bulk = calculateBulk(items, stacks);

        expect(bulk)
            .toEqual({
                light: 0,
                normal: 2
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
                                bulk: new Bulk("normal", 15)
                            })
                        ],
                        negateBulk: new CombinedBulk(15),
                        bulk: new Bulk("light", 1)
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
                        bulk: new Bulk("normal", 1)
                    }),
                    new Item({
                        stackGroup: "arrows",
                        quantity: 10
                    }),
                    new Item({
                        quantity: 9,
                        bulk: new Bulk("light", 1)
                    })
                ],
                negateBulk: new CombinedBulk(2),
                bulk: new Bulk("normal", 1)
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
});
