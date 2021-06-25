import { calculateDegreeOfSuccess, DegreeOfSuccess } from '../../src/module/degree-of-success';

describe('test degree of success rules', () => {
    test('1 should make it one degree worse', () => {
        expect(calculateDegreeOfSuccess({ dieValue: 1, modifier: 20 }, 10)).toBe(DegreeOfSuccess.SUCCESS);
        expect(calculateDegreeOfSuccess({ dieValue: 1, modifier: 20 }, 21)).toBe(DegreeOfSuccess.FAILURE);
        expect(calculateDegreeOfSuccess({ dieValue: 1, modifier: 19 }, 21)).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
        expect(calculateDegreeOfSuccess({ dieValue: 1, modifier: 10 }, 21)).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
    });

    test('20 should make it one degree better', () => {
        expect(calculateDegreeOfSuccess({ dieValue: 20, modifier: 21 }, 31)).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(calculateDegreeOfSuccess({ dieValue: 20, modifier: 11 }, 31)).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(calculateDegreeOfSuccess({ dieValue: 20, modifier: 10 }, 31)).toBe(DegreeOfSuccess.SUCCESS);
        expect(calculateDegreeOfSuccess({ dieValue: 20, modifier: 1 }, 31)).toBe(DegreeOfSuccess.FAILURE);
    });

    test('normal degrees of success', () => {
        expect(calculateDegreeOfSuccess({ dieValue: 10, modifier: 21 }, 21)).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(calculateDegreeOfSuccess({ dieValue: 10, modifier: 11 }, 21)).toBe(DegreeOfSuccess.SUCCESS);
        expect(calculateDegreeOfSuccess({ dieValue: 10, modifier: 10 }, 21)).toBe(DegreeOfSuccess.FAILURE);
        expect(calculateDegreeOfSuccess({ dieValue: 10, modifier: 1 }, 21)).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
    });
});
