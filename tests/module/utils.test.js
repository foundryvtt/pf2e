import { add, combineObjects, toNumber } from '../../src/module/utils.js';

describe('should combine objects', () => {
    test('combine two empty objects', () => {
        const result = combineObjects({}, {}, add);

        expect(result)
            .toEqual({});
    });

    test('combine one empty object', () => {
        const result = combineObjects({a: 3}, {}, add);

        expect(result)
            .toEqual({a: 3});
    });

    test('should be commutative', () => {
        const result = combineObjects({}, {a: 3}, add);

        expect(result)
            .toEqual({a: 3});
    });

    test('should merge different objects', () => {
        const result = combineObjects({b: 5}, {a: 3}, add);

        expect(result)
            .toEqual({a: 3, b: 5});
    });

    test('should merge intersecting objects', () => {
        const result = combineObjects({a: 1, b: 5}, {a: 3}, add);

        expect(result)
            .toEqual({a: 4, b: 5});
    });
});

describe('parse numbers', () => {
    test('null', () => {
        expect(toNumber(null))
            .toEqual(null);
    });

    test('undefined', () => {
        expect(toNumber(undefined))
            .toEqual(undefined);
    });

    test('empty string', () => {
        expect(toNumber(''))
            .toEqual(undefined);
    });

    test('1', () => {
        expect(toNumber('1'))
            .toEqual(1);
    });

    test('2', () => {
        expect(toNumber(2))
            .toEqual(2);
    });
});
