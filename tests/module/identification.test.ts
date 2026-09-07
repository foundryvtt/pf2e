import { getIdentificationAdjustment, getIdentificationData } from "@item/identification.ts";
import type { PhysicalItemPF2e } from "@item/physical/index.ts";
import type { Rarity } from "@module/data.ts";

function itemStub({
    level = 4,
    rarity = "common",
    traits = [],
    isMagical = false,
}: {
    level?: number;
    rarity?: Rarity;
    traits?: string[];
    isMagical?: boolean;
} = {}): PhysicalItemPF2e {
    return {
        level,
        rarity,
        isMagical,
        traits: new Set(traits),
        system: { traits: { value: traits } },
    } as unknown as PhysicalItemPF2e;
}

const options = { notMatchingTraditionModifier: 5 };

describe("identification DCs", () => {
    test("adjustment is seeded from rarity, with cursed items treated as unique", () => {
        expect(getIdentificationAdjustment(itemStub({ rarity: "common" }))).toBe("normal");
        expect(getIdentificationAdjustment(itemStub({ rarity: "uncommon" }))).toBe("hard");
        expect(getIdentificationAdjustment(itemStub({ rarity: "rare" }))).toBe("very-hard");
        expect(getIdentificationAdjustment(itemStub({ rarity: "unique" }))).toBe("incredibly-hard");
        expect(getIdentificationAdjustment(itemStub({ rarity: "common", traits: ["cursed"] }))).toBe("incredibly-hard");
    });

    test("non-magical items use a single crafting DC", () => {
        const data = getIdentificationData(itemStub({ level: 4 }), options);
        expect(data.base).toBe(19);
        expect(data.adjusted).toBe(19);
        expect(data.dcs).toEqual({ crafting: 19 });
        expect(data.offTradition).toEqual([]);
    });

    test("rarity raises the DC by its adjustment", () => {
        expect(getIdentificationData(itemStub({ level: 4, rarity: "uncommon" }), options).adjusted).toBe(21);
        expect(getIdentificationData(itemStub({ level: 4, rarity: "rare" }), options).adjusted).toBe(24);
    });

    test("an explicit adjustment overrides the rarity-derived one", () => {
        const data = getIdentificationData(itemStub({ level: 4, rarity: "rare" }), { ...options, adjustment: "easy" });
        expect(data.adjustment).toBe("easy");
        expect(data.adjusted).toBe(17);
    });

    test("magical items without a tradition share one DC across all four skills", () => {
        const data = getIdentificationData(itemStub({ level: 3, isMagical: true, traits: ["magical"] }), options);
        expect(data.dcs).toEqual({ arcana: 18, nature: 18, occultism: 18, religion: 18 });
        expect(data.offTradition).toEqual([]);
    });

    test("skills off the item's tradition take the not-matching modifier", () => {
        const data = getIdentificationData(itemStub({ level: 3, isMagical: true, traits: ["arcane"] }), options);
        expect(data.dcs).toEqual({ arcana: 18, nature: 23, occultism: 23, religion: 23 });
        expect(data.offTradition.sort()).toEqual(["nature", "occultism", "religion"]);
    });

    test("the adjustment applies before the not-matching modifier", () => {
        const item = itemStub({ level: 3, rarity: "uncommon", isMagical: true, traits: ["divine"] });
        const data = getIdentificationData(item, options);
        expect(data.base).toBe(18);
        expect(data.adjusted).toBe(20);
        expect(data.dcs).toEqual({ arcana: 25, nature: 25, occultism: 25, religion: 20 });
    });

    test("proficiency without level lowers the base DC", () => {
        const data = getIdentificationData(itemStub({ level: 4 }), { ...options, pwol: true });
        expect(data.base).toBe(15);
    });
});
