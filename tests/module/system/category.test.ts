import { DamageCategory } from "../../../src/module/system/damage/damage";

// Ensure we start from a blank slate on each test, since we have some wonderful global state.
beforeEach(() => DamageCategory.clearCustom());

describe("#physicalBase", () => {
    test("slashing is a physical damage type", () => {
        expect(DamageCategory.fromDamageType("slashing")).toBe(DamageCategory.PHYSICAL);
    });

    test("piercing is a physical damage type", () => {
        expect(DamageCategory.fromDamageType("piercing")).toBe(DamageCategory.PHYSICAL);
    });

    test("we can obtain the three basic physical damage types", () => {
        expect(DamageCategory.toDamageTypes(DamageCategory.PHYSICAL)).toEqual(
            new Set(["piercing", "slashing", "bludgeoning"])
        );
    });
});

describe("#energyBase", () => {
    test("force is an energy damage type", () => {
        expect(DamageCategory.fromDamageType("force")).toBe(DamageCategory.ENERGY);
    });
});

describe("#alignmentBase", () => {
    test("good is an alignment damage type", () => {
        expect(DamageCategory.fromDamageType("good")).toBe(DamageCategory.ALIGNMENT);
    });
});

describe("#physicalOverride", () => {
    test("force is now a physical damage type", () => {
        DamageCategory.addCustomDamageType(DamageCategory.PHYSICAL, "force");
        expect(DamageCategory.fromDamageType("force")).toBe(DamageCategory.PHYSICAL);
    });

    test("force is now an alignment damage type after 2 overrides", () => {
        DamageCategory.addCustomDamageType(DamageCategory.PHYSICAL, "force");
        DamageCategory.addCustomDamageType(DamageCategory.ALIGNMENT, "force");
        expect(DamageCategory.fromDamageType("force")).toBe(DamageCategory.ALIGNMENT);
    });
});

describe("#utilityMethods", () => {
    test("the base categories are physical, energy, and alignment", () => {
        expect(DamageCategory.baseCategories()).toEqual(
            new Set([DamageCategory.PHYSICAL, DamageCategory.ALIGNMENT, DamageCategory.ENERGY])
        );
        expect(DamageCategory.customCategories()).toEqual(new Set([]));
    });

    test("customCategories returns custom categories", () => {
        DamageCategory.addCustomDamageType("cool", "bludgeoning");
        expect(DamageCategory.customCategories()).toEqual(new Set(["cool"]));
    });
});

describe("#customCategory", () => {
    test("cool is a custom category", () => {
        DamageCategory.addCustomDamageType("cool", "bludgeoning");
        expect(DamageCategory.fromDamageType("bludgeoning")).toBe("cool");
    });

    test("bludgeoning is no longer physical", () => {
        DamageCategory.addCustomDamageType("cool", "bludgeoning");
        expect(DamageCategory.toDamageTypes(DamageCategory.PHYSICAL)).toEqual(new Set(["piercing", "slashing"]));
        expect(DamageCategory.toDamageTypes("cool")).toEqual(new Set(["bludgeoning"]));
    });

    test("nonexistent category has no members", () => {
        expect(DamageCategory.toDamageTypes("noexist")).toEqual(new Set([]));
    });
});
