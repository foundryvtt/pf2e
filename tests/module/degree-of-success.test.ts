import { DegreeOfSuccess } from "@system/degree-of-success.ts";

describe("test degree of success rules", () => {
    test("normal degrees of success", () => {
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 21 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 11 }, 21).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 10 }, 21).value).toBe(DegreeOfSuccess.FAILURE);
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 1 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
    });

    test("1 should make it one degree worse", () => {
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 20 }, 10).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 20 }, 21).value).toBe(DegreeOfSuccess.FAILURE);
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 19 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 10 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
    });

    test("20 should make it one degree better", () => {
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 21 }, 31).value).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 11 }, 31).value).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 10 }, 31).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 1 }, 31).value).toBe(DegreeOfSuccess.FAILURE);
    });
});
