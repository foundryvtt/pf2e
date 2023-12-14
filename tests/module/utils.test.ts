import { applyNTimes, padArray } from "@util";

describe("pad array", () => {
    test("empty", () => {
        expect(padArray([], 2, 1)).toEqual([1, 1]);
    });

    test("full", () => {
        expect(padArray([1, 2], 2, 3)).toEqual([1, 2]);
    });

    test("one off", () => {
        expect(padArray([1], 2, 2)).toEqual([1, 2]);
    });
});

describe("repeated assignment", () => {
    test("0 times is start element", () => {
        expect(applyNTimes((x) => x + 1, 0, 2)).toEqual(2);
    });

    test("1 times", () => {
        expect(applyNTimes((x) => x + 1, 1, 2)).toEqual(3);
    });

    test("2 times", () => {
        expect(applyNTimes((x) => x + 1, 2, 2)).toEqual(4);
    });
});
