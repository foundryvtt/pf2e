import { add, combineObjects } from '../../src/module/utils.js';

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