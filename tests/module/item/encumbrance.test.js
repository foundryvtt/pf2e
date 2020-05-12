import {Bulk} from '../../../src/module/item/bulk.js';
import { calculateEncumbrance } from '../../../src/module/item/encumbrance.js';

describe('should calculate encumbrance', () => {
    test('light bulk is ignored', () => {
        const encumbrance = calculateEncumbrance(9, 1, new Bulk({normal: 5, light: 9}));

        expect(encumbrance.encumberedAt)
            .toBe(15);
        expect(encumbrance.limit)
            .toBe(20);
        expect(encumbrance.bulk)
            .toBe(5);
        expect(encumbrance.encumberedPercentage)
            .toBe(39);
        expect(encumbrance.isEncumbered)
            .toBe(false);
        expect(encumbrance.limitPercentage)
            .toBe(29);
        expect(encumbrance.isOverLimit)
            .toBe(false);
    });

    test('is encumbered', () => {
        const encumbrance = calculateEncumbrance(9, 1, new Bulk({normal: 16}));

        expect(encumbrance.encumberedAt)
            .toBe(15);
        expect(encumbrance.limit)
            .toBe(20);
        expect(encumbrance.bulk)
            .toBe(16);
        expect(encumbrance.encumberedPercentage)
            .toBe(106);
        expect(encumbrance.isEncumbered)
            .toBe(true);
        expect(encumbrance.limitPercentage)
            .toBe(80);
        expect(encumbrance.isOverLimit)
            .toBe(false);
        expect(encumbrance.limitPercentageMax100)
            .toBe(80)
    });

    test('is over limit', () => {
        const encumbrance = calculateEncumbrance(9, 1, new Bulk({normal: 21}));

        expect(encumbrance.encumberedAt)
            .toBe(15);
        expect(encumbrance.limit)
            .toBe(20);
        expect(encumbrance.bulk)
            .toBe(21);
        expect(encumbrance.encumberedPercentage)
            .toBe(140);
        expect(encumbrance.isEncumbered)
            .toBe(true);
        expect(encumbrance.limitPercentage)
            .toBe(105);
        expect(encumbrance.isOverLimit)
            .toBe(true);
        expect(encumbrance.limitPercentageMax100)
            .toBe(100)
    });
});
