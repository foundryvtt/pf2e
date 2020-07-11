import {Bulk} from '../../../src/module/item/bulk';
import {calculateEncumbrance} from '../../../src/module/item/encumbrance';

describe('should calculate encumbrance', () => {
    test('light bulk is ignored', () => {
        const encumbrance = calculateEncumbrance(9, 2, 1, new Bulk({normal: 5, light: 9}));

        expect(encumbrance.encumberedAt)
            .toBe(16);
        expect(encumbrance.limit)
            .toBe(20);
        expect(encumbrance.bulk)
            .toBe(5);
        expect(encumbrance.encumberedPercentage)
            .toBe(34);
        expect(encumbrance.isEncumbered)
            .toBe(false);
        expect(encumbrance.limitPercentage)
            .toBe(28);
        expect(encumbrance.isOverLimit)
            .toBe(false);
    });

    test('is encumbered', () => {
        const encumbrance = calculateEncumbrance(9, 1, 1, new Bulk({normal: 16}));

        expect(encumbrance.encumberedAt)
            .toBe(15);
        expect(encumbrance.limit)
            .toBe(20);
        expect(encumbrance.bulk)
            .toBe(16);
        expect(encumbrance.encumberedPercentage)
            .toBe(100);
        expect(encumbrance.isEncumbered)
            .toBe(true);
        expect(encumbrance.limitPercentage)
            .toBe(76);
        expect(encumbrance.isOverLimit)
            .toBe(false);
        expect(encumbrance.limitPercentageMax100)
            .toBe(76);
    });

    test('is over limit', () => {
        const encumbrance = calculateEncumbrance(9, 1, 1, new Bulk({normal: 21}));

        expect(encumbrance.encumberedAt)
            .toBe(15);
        expect(encumbrance.limit)
            .toBe(20);
        expect(encumbrance.bulk)
            .toBe(21);
        expect(encumbrance.encumberedPercentage)
            .toBe(131);
        expect(encumbrance.isEncumbered)
            .toBe(true);
        expect(encumbrance.limitPercentage)
            .toBe(100);
        expect(encumbrance.isOverLimit)
            .toBe(true);
        expect(encumbrance.limitPercentageMax100)
            .toBe(100);
    });
});

describe('should calculate encumbrance based on size', () => {
    test('tiny size', () => {
        const encumbrance = calculateEncumbrance(
            2,
            0,
            0,
            new Bulk(),
            'tiny'
        );

        expect(encumbrance.encumberedAt)
            .toBe(4);
        expect(encumbrance.limit)
            .toBe(7);
    });

    test('large size', () => {
        const encumbrance = calculateEncumbrance(
            3,
            0,
            0,
            new Bulk(),
            'lg'
        );

        expect(encumbrance.encumberedAt)
            .toBe(13);
        expect(encumbrance.limit)
            .toBe(23);
    });

    test('huge size', () => {
        const encumbrance = calculateEncumbrance(
            3,
            0,
            0,
            new Bulk(),
            'huge'
        );

        expect(encumbrance.encumberedAt)
            .toBe(23);
        expect(encumbrance.limit)
            .toBe(43);
    });

    test('gargantuan size', () => {
        const encumbrance = calculateEncumbrance(
            3,
            0,
            0,
            new Bulk(),
            'grg'
        );

        expect(encumbrance.encumberedAt)
            .toBe(43);
        expect(encumbrance.limit)
            .toBe(83);
    });
});
