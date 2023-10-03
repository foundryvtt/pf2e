import {
    adjustDCByRarity,
    calculateDC,
    calculateSimpleDC,
    calculateSpellDC,
    combineDCAdjustments,
    createDifficultyScale,
    rarityToDCAdjustment,
} from "@module/dc.ts";

describe("test DCs", () => {
    test("calculate DC by level", () => {
        expect(calculateDC(-1)).toBe(13);
        expect(calculateDC(0)).toBe(14);
        expect(calculateDC(1)).toBe(15);
        expect(calculateDC(2)).toBe(16);
        expect(calculateDC(3)).toBe(18);
        expect(calculateDC(4)).toBe(19);
        expect(calculateDC(5)).toBe(20);
        expect(calculateDC(6)).toBe(22);
        expect(calculateDC(7)).toBe(23);
        expect(calculateDC(8)).toBe(24);
        expect(calculateDC(9)).toBe(26);
        expect(calculateDC(10)).toBe(27);
        expect(calculateDC(11)).toBe(28);
        expect(calculateDC(12)).toBe(30);
        expect(calculateDC(13)).toBe(31);
        expect(calculateDC(14)).toBe(32);
        expect(calculateDC(15)).toBe(34);
        expect(calculateDC(16)).toBe(35);
        expect(calculateDC(17)).toBe(36);
        expect(calculateDC(18)).toBe(38);
        expect(calculateDC(19)).toBe(39);
        expect(calculateDC(20)).toBe(40);
        expect(calculateDC(21)).toBe(42);
        expect(calculateDC(22)).toBe(44);
        expect(calculateDC(23)).toBe(46);
        expect(calculateDC(24)).toBe(48);
        expect(calculateDC(25)).toBe(50);
    });

    test("should calculate DC by level without proficiency", () => {
        expect(calculateDC(-1, { proficiencyWithoutLevel: true })).toBe(13);
        expect(calculateDC(0, { proficiencyWithoutLevel: true })).toBe(14);
        expect(calculateDC(1, { proficiencyWithoutLevel: true })).toBe(14);
        expect(calculateDC(2, { proficiencyWithoutLevel: true })).toBe(14);
        expect(calculateDC(3, { proficiencyWithoutLevel: true })).toBe(15);
        expect(calculateDC(4, { proficiencyWithoutLevel: true })).toBe(15);
        expect(calculateDC(5, { proficiencyWithoutLevel: true })).toBe(15);
        expect(calculateDC(6, { proficiencyWithoutLevel: true })).toBe(16);
        expect(calculateDC(7, { proficiencyWithoutLevel: true })).toBe(16);
        expect(calculateDC(8, { proficiencyWithoutLevel: true })).toBe(16);
        expect(calculateDC(9, { proficiencyWithoutLevel: true })).toBe(17);
        expect(calculateDC(10, { proficiencyWithoutLevel: true })).toBe(17);
        expect(calculateDC(11, { proficiencyWithoutLevel: true })).toBe(17);
        expect(calculateDC(12, { proficiencyWithoutLevel: true })).toBe(18);
        expect(calculateDC(13, { proficiencyWithoutLevel: true })).toBe(18);
        expect(calculateDC(14, { proficiencyWithoutLevel: true })).toBe(18);
        expect(calculateDC(15, { proficiencyWithoutLevel: true })).toBe(19);
        expect(calculateDC(16, { proficiencyWithoutLevel: true })).toBe(19);
        expect(calculateDC(17, { proficiencyWithoutLevel: true })).toBe(19);
        expect(calculateDC(18, { proficiencyWithoutLevel: true })).toBe(20);
        expect(calculateDC(19, { proficiencyWithoutLevel: true })).toBe(20);
        expect(calculateDC(20, { proficiencyWithoutLevel: true })).toBe(20);
        expect(calculateDC(21, { proficiencyWithoutLevel: true })).toBe(21);
        expect(calculateDC(22, { proficiencyWithoutLevel: true })).toBe(22);
        expect(calculateDC(23, { proficiencyWithoutLevel: true })).toBe(23);
        expect(calculateDC(24, { proficiencyWithoutLevel: true })).toBe(24);
        expect(calculateDC(25, { proficiencyWithoutLevel: true })).toBe(25);
    });

    test("unknown DC should become 0 level DC", () => {
        expect(calculateDC(-2)).toBe(14);
        expect(calculateDC(-2, { proficiencyWithoutLevel: true })).toBe(14);
    });

    test("rarities should affect DC", () => {
        expect(adjustDCByRarity(calculateDC(1), "uncommon")).toBe(17);
        expect(adjustDCByRarity(calculateDC(1), "rare")).toBe(20);
        expect(adjustDCByRarity(calculateDC(1), "unique")).toBe(25);
    });

    test("simple DCs", () => {
        expect(calculateSimpleDC("untrained")).toBe(10);
        expect(calculateSimpleDC("trained")).toBe(15);
        expect(calculateSimpleDC("expert")).toBe(20);
        expect(calculateSimpleDC("master")).toBe(30);
        expect(calculateSimpleDC("legendary")).toBe(40);
    });

    test("simple DCs without proficiency", () => {
        expect(calculateSimpleDC("untrained", { proficiencyWithoutLevel: true })).toBe(10);
        expect(calculateSimpleDC("trained", { proficiencyWithoutLevel: true })).toBe(15);
        expect(calculateSimpleDC("expert", { proficiencyWithoutLevel: true })).toBe(20);
        expect(calculateSimpleDC("master", { proficiencyWithoutLevel: true })).toBe(25);
        expect(calculateSimpleDC("legendary", { proficiencyWithoutLevel: true })).toBe(30);
    });

    test("should return adjustment by rarity", () => {
        expect(rarityToDCAdjustment()).toBe("normal");
        expect(rarityToDCAdjustment("common")).toBe("normal");
        expect(rarityToDCAdjustment("uncommon")).toBe("hard");
        expect(rarityToDCAdjustment("rare")).toBe("very-hard");
        expect(rarityToDCAdjustment("unique")).toBe("incredibly-hard");
    });

    test("should allow combining adjustments", () => {
        expect(combineDCAdjustments("normal", "normal")).toBe("normal");
        expect(combineDCAdjustments("normal", "easy")).toBe("easy");
        expect(combineDCAdjustments("normal", "very-easy")).toBe("very-easy");
        expect(combineDCAdjustments("normal", "incredibly-easy")).toBe("incredibly-easy");
        expect(combineDCAdjustments("hard", "normal")).toBe("hard");
        expect(combineDCAdjustments("hard", "easy")).toBe("normal");
        expect(combineDCAdjustments("hard", "very-easy")).toBe("easy");
        expect(combineDCAdjustments("hard", "incredibly-easy")).toBe("very-easy");
        expect(combineDCAdjustments("very-hard", "normal")).toBe("very-hard");
        expect(combineDCAdjustments("very-hard", "easy")).toBe("hard");
        expect(combineDCAdjustments("very-hard", "very-easy")).toBe("normal");
        expect(combineDCAdjustments("very-hard", "incredibly-easy")).toBe("easy");
        expect(combineDCAdjustments("incredibly-hard", "normal")).toBe("incredibly-hard");
        expect(combineDCAdjustments("incredibly-hard", "easy")).toBe("very-hard");
        expect(combineDCAdjustments("incredibly-hard", "very-easy")).toBe("hard");
        expect(combineDCAdjustments("incredibly-hard", "incredibly-easy")).toBe("normal");
        expect(combineDCAdjustments("very-hard", "very-hard")).toBe("incredibly-hard");
        expect(combineDCAdjustments("incredibly-hard", "very-hard")).toBe("incredibly-hard");
    });

    test("should create difficulty scales", () => {
        expect(createDifficultyScale(10, "easy")).toEqual([8, 10, 12, 15, 20]);
        expect(createDifficultyScale(10, "hard")).toEqual([12, 15, 20]);
        expect(createDifficultyScale(10, "very-hard")).toEqual([15, 20]);
    });

    test("should calculate spell dc levels", () => {
        expect(calculateSpellDC(1)).toBe(15);
        expect(calculateSpellDC(2)).toBe(18);
        expect(calculateSpellDC(3)).toBe(20);
        expect(calculateSpellDC(4)).toBe(23);
        expect(calculateSpellDC(5)).toBe(26);
        expect(calculateSpellDC(6)).toBe(28);
        expect(calculateSpellDC(7)).toBe(31);
        expect(calculateSpellDC(8)).toBe(34);
        expect(calculateSpellDC(9)).toBe(36);
        expect(calculateSpellDC(10)).toBe(39);
    });
});
