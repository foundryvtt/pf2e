import { addSign, applyNTimes, padArray, zip } from "@util";

describe("format sign for numbers", () => {
    test("0", () => {
        expect(addSign(0)).toEqual("+0");
    });

    test("negative", () => {
        expect(addSign(-1)).toEqual("-1");
    });

    test("positive", () => {
        expect(addSign(1)).toEqual("+1");
    });
});

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

describe("zip arrays", () => {
    test("empty", () => {
        expect(zip([], [], (a, b) => [a, b])).toEqual([]);
    });

    test("a larger", () => {
        expect(zip([1, 3], [2], (a, b) => [a, b])).toEqual([[1, 2]]);
    });

    test("b larger", () => {
        expect(zip([1], [2, 3], (a, b) => [a, b])).toEqual([[1, 2]]);
    });

    test("same length", () => {
        expect(zip([1, 3], [2, 4], (a, b) => [a, b])).toEqual([
            [1, 2],
            [3, 4],
        ]);
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
