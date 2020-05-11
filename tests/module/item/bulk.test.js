import { Bulk, calculateBulk, Item } from '../../../src/module/item/bulk';

describe('should calculate bulk', () => {
    test('empty inventory', () => {
        const bulk = calculateBulk([]);
        
        expect(bulk).toEqual({
            light: 0,
            normal: 0
        })
    });

    test('11 light items are 1 bulk and 1 light bulk', () => {
        const bulk = calculateBulk([new Item({
            bulk: new Bulk('light', 11)
        })]);

        expect(bulk).toEqual({
            light: 1,
            normal: 1
        })
    });

    test('light armor that is worn counts as 1 bulk', () => {
        const items = [new Item({
            isArmorButNotWorn: true, 
            bulk: new Bulk("light", 1)
        })];
        const bulk = calculateBulk(items);

        expect(bulk).toEqual({
            light: 0,
            normal: 1
        })
    });

    test('armor that is worn counts as 1 more bulk', () => {
        const items = [
            new Item({isArmorButNotWorn: true, bulk: new Bulk("normal", 1)})
        ];
        const bulk = calculateBulk(items);

        expect(bulk).toEqual({
            light: 0,
            normal: 2
        })
    });
});
