import { NPCPF2e } from "@actor";
import { Rarity } from "@module/data";
import { identifyCreature } from "@module/recall-knowledge";

function createCreature(level: number, rarity: Rarity, traits: string[]): NPCPF2e {
    return {
        system: {
            details: {
                level: {
                    value: level,
                },
            },
            traits: {
                value: traits,
                rarity,
            },
        },
    } as unknown as NPCPF2e;
}

describe("test recall knowledge on creatures", () => {
    test("identify simple creature", () => {
        expect(identifyCreature(createCreature(1, "common", ["construct", "elemental"]))).toEqual({
            skills: new Set(["arcana", "crafting", "nature"]),
            skill: { dc: 15, progression: [15, 17, 20, 25], start: "normal" },
            specificLoreDC: { dc: 10, progression: [10, 13, 15, 17, 20, 25], start: "very easy" },
            unspecificLoreDC: { dc: 13, progression: [13, 15, 17, 20, 25], start: "easy" },
        });
    });

    test("identify uncommon creature", () => {
        expect(identifyCreature(createCreature(2, "uncommon", ["fey"]))).toEqual({
            skills: new Set(["nature"]),
            skill: { dc: 18, progression: [18, 21, 26], start: "hard" },
            specificLoreDC: { dc: 14, progression: [14, 16, 18, 21, 26], start: "easy" },
            unspecificLoreDC: { dc: 16, progression: [16, 18, 21, 26], start: "normal" },
        });
    });

    test("identify creature without traits", () => {
        expect(identifyCreature(createCreature(2, "uncommon", []))).toEqual({
            skills: new Set(),
            skill: { dc: 18, progression: [18, 21, 26], start: "hard" },
            specificLoreDC: { dc: 14, progression: [14, 16, 18, 21, 26], start: "easy" },
            unspecificLoreDC: { dc: 16, progression: [16, 18, 21, 26], start: "normal" },
        });
    });

    test("identify unique creature", () => {
        expect(identifyCreature(createCreature(2, "unique", ["animal"]))).toEqual({
            skills: new Set(["nature"]),
            skill: { dc: 26, progression: [26], start: "incredibly hard" },
            specificLoreDC: { dc: 18, progression: [18, 21, 26], start: "hard" },
            unspecificLoreDC: { dc: 21, progression: [21, 26], start: "very hard" },
        });
    });
});
