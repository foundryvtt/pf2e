import { DamageCategorization } from "../../../src/module/system/damage/damage";

// Ensure we start from a blank slate on each test, since we have some wonderful global state.
beforeEach(() => DamageCategorization.clearCustom());

describe("#physicalBase", () => {
    test("slashing is a physical damage type", () => {
        expect(DamageCategorization.fromDamageType("slashing")).toBe(DamageCategorization.PHYSICAL);
    });

    test("piercing is a physical damage type", () => {
        expect(DamageCategorization.fromDamageType("piercing")).toBe(DamageCategorization.PHYSICAL);
    });

    test("we can obtain the three basic physical damage types", () => {
        expect(DamageCategorization.toDamageTypes(DamageCategorization.PHYSICAL)).toEqual(
            new Set(["piercing", "slashing", "bludgeoning"])
        );
    });
});

describe("#energyBase", () => {
    test("force is an energy damage type", () => {
        expect(DamageCategorization.fromDamageType("force")).toBe(DamageCategorization.ENERGY);
    });
});

describe("#alignmentBase", () => {
    test("good is an alignment damage type", () => {
        expect(DamageCategorization.fromDamageType("good")).toBe(DamageCategorization.ALIGNMENT);
    });
});

describe("#physicalOverride", () => {
    test("force is now a physical damage type", () => {
        DamageCategorization.addCustomDamageType(DamageCategorization.PHYSICAL, "force");
        expect(DamageCategorization.fromDamageType("force")).toBe(DamageCategorization.PHYSICAL);
    });

    test("force is now an alignment damage type after 2 overrides", () => {
        DamageCategorization.addCustomDamageType(DamageCategorization.PHYSICAL, "force");
        DamageCategorization.addCustomDamageType(DamageCategorization.ALIGNMENT, "force");
        expect(DamageCategorization.fromDamageType("force")).toBe(DamageCategorization.ALIGNMENT);
    });
});

describe("#utilityMethods", () => {
    test("the base categories are physical, energy, and alignment", () => {
        expect(DamageCategorization.baseCategories()).toEqual(
            new Set([DamageCategorization.PHYSICAL, DamageCategorization.ALIGNMENT, DamageCategorization.ENERGY])
        );
        expect(DamageCategorization.customCategories()).toEqual(new Set([]));
    });

    test("customCategories returns custom categories", () => {
        DamageCategorization.addCustomDamageType("cool", "bludgeoning");
        expect(DamageCategorization.customCategories()).toEqual(new Set(["cool"]));
    });
});

describe("#customCategory", () => {
    test("cool is a custom category", () => {
        DamageCategorization.addCustomDamageType("cool", "bludgeoning");
        expect(DamageCategorization.fromDamageType("bludgeoning")).toBe("cool");
    });

    test("bludgeoning is no longer physical", () => {
        DamageCategorization.addCustomDamageType("cool", "bludgeoning");
        expect(DamageCategorization.toDamageTypes(DamageCategorization.PHYSICAL)).toEqual(
            new Set(["piercing", "slashing"])
        );
        expect(DamageCategorization.toDamageTypes("cool")).toEqual(new Set(["bludgeoning"]));
    });

    test("nonexistent category has no members", () => {
        expect(DamageCategorization.toDamageTypes("noexist")).toEqual(new Set([]));
    });
});
