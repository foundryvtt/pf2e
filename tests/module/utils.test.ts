import { applyNTimes } from "@util";

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
