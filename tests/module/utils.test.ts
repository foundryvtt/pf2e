import {add, addSign, combineObjects, padArray, toNumber} from '../../src/module/utils';

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

describe('format sign for numbers', () => {
    test('0', () => {
        expect(addSign(0))
            .toEqual('0');
    });

    test('negative', () => {
        expect(addSign(-1))
            .toEqual('-1');
    });

    test('positive', () => {
        expect(addSign(1))
            .toEqual('+1');
    });
});

describe('pad array', () => {
    test('empty', () => {
        expect(padArray([], 2, 1))
            .toEqual([1, 1]);
    });

    test('full', () => {
        expect(padArray([1, 2], 2, 3))
            .toEqual([1, 2]);
    });

    test('one off', () => {
        expect(padArray([1], 2, 2))
            .toEqual([1, 2]);
    });
});
