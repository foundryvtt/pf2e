import { NPCPF2e } from "@actor";
import { Rarity } from "@module/data.ts";
import { creatureIdentificationDCs } from "@module/recall-knowledge.ts";

function createCreature(level: number, rarity: Rarity, traits: string[]): NPCPF2e {
    return {
        level,
        rarity,
        system: {
            traits: {
                value: traits,
                rarity,
            },
        },
    } as unknown as NPCPF2e;
}

describe("test recall knowledge on creatures", () => {
    test("identify simple creature", () => {
        expect(creatureIdentificationDCs(createCreature(1, "common", ["construct", "elemental"]))).toEqual({
            skills: ["arcana", "crafting", "nature"],
            standard: { dc: 15, progression: [15, 17, 20, 25], start: "normal" },
            lore: [
                { dc: 13, progression: [13, 15, 17, 20, 25], start: "easy" },
                { dc: 10, progression: [10, 13, 15, 17, 20, 25], start: "very-easy" },
            ],
        });
    });

    test("identify uncommon creature", () => {
        expect(creatureIdentificationDCs(createCreature(2, "uncommon", ["fey"]))).toEqual({
            skills: ["nature"],
            standard: { dc: 18, progression: [18, 21, 26], start: "hard" },
            lore: [
                { dc: 16, progression: [16, 18, 21, 26], start: "normal" },
                { dc: 14, progression: [14, 16, 18, 21, 26], start: "easy" },
            ],
        });
    });

    test("identify creature without traits", () => {
        expect(creatureIdentificationDCs(createCreature(2, "uncommon", []))).toEqual({
            skills: [],
            standard: { dc: 18, progression: [18, 21, 26], start: "hard" },
            lore: [
                { dc: 16, progression: [16, 18, 21, 26], start: "normal" },
                { dc: 14, progression: [14, 16, 18, 21, 26], start: "easy" },
            ],
        });
    });

    test("identify unique creature", () => {
        expect(creatureIdentificationDCs(createCreature(2, "unique", ["animal"]))).toEqual({
            skills: ["nature"],
            standard: { dc: 26, progression: [26], start: "incredibly-hard" },
            lore: [
                { dc: 21, progression: [21, 26], start: "very-hard" },
                { dc: 18, progression: [18, 21, 26], start: "hard" },
            ],
        });
    });
});
