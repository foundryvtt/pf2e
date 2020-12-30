import {parseTraits} from "../../src/module/traits";

describe('should split a trait string', () => {
    test('split on different separators', () => {
        const traitString = "Test0,Test1;Test2|Test 3";
        const result = parseTraits(traitString);

        expect(result.length).toEqual(4);
        expect(result[0]).toEqual("Test0");
        expect(result[1]).toEqual("Test1");
        expect(result[2]).toEqual("Test2");
        expect(result[3]).toEqual("Test 3");
    });
});