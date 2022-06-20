import { DiceModifierPF2e } from "@actor/modifiers";
import { OneToFour, Rarity, ZeroToFour, ZeroToThree } from "@module/data";
import { DamageDieSize } from "@system/damage/damage";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { RawPredicate } from "@system/predication";
import { isBlank } from "@util";
import type { ResilientRuneType } from "./armor/data";
import type { ArmorData, WeaponData } from "./data";
import type { OtherWeaponTag, StrikingRuneType, WeaponPropertyRuneType, WeaponTrait } from "./weapon/types";

export function getPropertySlots(itemData: WeaponData | ArmorData): ZeroToFour {
    let slots = 0;
    if (itemData.data.preciousMaterial?.value === "orichalcum") {
        slots += 1;
    }
    let potencyRune = itemData.data.potencyRune?.value;
    if (game.settings.get("pf2e", "automaticBonusVariant") !== "noABP") {
        potencyRune = 0;
        slots += getPropertyRunes(itemData, 4).length;
        slots += 1;
    }
    if (potencyRune) {
        slots += potencyRune;
    }
    return slots as ZeroToFour;
}

export function getPropertyRunes(itemData: WeaponData | ArmorData, slots: number): string[] {
    const runes: string[] = [];
    type RuneIndex = "propertyRune1" | "propertyRune2" | "propertyRune3" | "propertyRune4";
    for (let i = 1; i <= slots; i += 1) {
        const rune = itemData.data[`propertyRune${i}` as RuneIndex]?.value;
        if (!isBlank(rune)) {
            runes.push(rune);
        }
    }
    return runes;
}

const strikingRuneValues: Map<StrikingRuneType | null, ZeroToThree | undefined> = new Map([
    ["striking", 1],
    ["greaterStriking", 2],
    ["majorStriking", 3],
]);

export function getStrikingDice(itemData: { strikingRune: { value: StrikingRuneType | null } }): ZeroToThree {
    return strikingRuneValues.get(itemData.strikingRune.value) ?? 0;
}

const resilientRuneValues: Map<ResilientRuneType | null, ZeroToThree | undefined> = new Map([
    ["resilient", 1],
    ["greaterResilient", 2],
    ["majorResilient", 3],
]);
export function getResiliencyBonus(itemData: { resiliencyRune: { value: ResilientRuneType | null } }): ZeroToThree {
    return resilientRuneValues.get(itemData.resiliencyRune.value) ?? 0;
}

interface RuneDiceModifier {
    diceNumber?: number;
    dieSize?: DamageDieSize;
    damageType?: string;
    predicate?: RawPredicate;
}

function toModifiers(rune: WeaponPropertyRuneType, dice: RuneDiceModifier[]): DiceModifierPF2e[] {
    dice = deepClone(dice);
    return dice.map((die) => {
        return new DiceModifierPF2e({
            slug: rune,
            label: CONFIG.PF2E.runes.weapon.property[rune]?.name,
            diceNumber: die.diceNumber ?? 1,
            dieSize: die.dieSize ?? "d6",
            damageType: die.damageType,
            predicate: die.predicate,
        });
    });
}

interface RollNoteData {
    outcome?: DegreeOfSuccessString[];
    predicate?: RawPredicate;
    text: string;
}

export interface WeaponPropertyRuneData {
    attack?: {
        notes?: RollNoteData[];
    };
    damage?: {
        dice?: {
            damageType?: string;
            diceNumber?: number;
            dieSize?: DamageDieSize;
            predicate?: RawPredicate;
        }[];
        notes?: RollNoteData[];
    };
    level: number;
    name: string;
    price: number; // in gp
    rarity: Rarity;
    slug: string;
    traits: WeaponTrait[];
    otherTags?: OtherWeaponTag[];
}

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=27
export const WEAPON_PROPERTY_RUNES: Record<WeaponPropertyRuneType, WeaponPropertyRuneData> = {
    anarchic: {
        damage: {
            dice: [
                { damageType: "chaotic", diceNumber: 1, dieSize: "d6", predicate: { all: ["target:trait:lawful"] } },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["target:trait:lawful"] },
                    text: "PF2E.WeaponPropertyRune.anarchic.Note.criticalSuccess",
                },
            ],
        },
        level: 11,
        // name: "PF2E.WeaponPropertyRune.anarchic.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneAnarchic",
        price: 1_400,
        rarity: "common",
        slug: "anarchic",
        traits: ["chaotic", "evocation", "magical"],
    },
    ancestralEchoing: {
        level: 15,
        // name: "PF2E.WeaponPropertyRune.ancestralEchoing.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneAncestralEchoing",
        price: 9_500,
        rarity: "rare",
        slug: "ancestralEchoing",
        traits: ["dwarf", "evocation", "magical", "saggorak"],
    },
    anchoring: {
        damage: {
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.anchoring.Note.criticalSuccess" }],
        },
        level: 10,
        // name: "PF2E.WeaponPropertyRune.anchoring.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneAnchoring",
        price: 900,
        rarity: "uncommon",
        slug: "anchoring",
        traits: ["abjuration", "magical"],
    },
    axiomatic: {
        damage: {
            dice: [
                { damageType: "lawful", diceNumber: 1, dieSize: "d6", predicate: { all: ["target:trait:chaotic"] } },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["target:trait:chaotic"] },
                    text: "PF2E.WeaponPropertyRune.axiomatic.Note.criticalSuccess",
                },
            ],
        },
        level: 11,
        // name: "PF2E.WeaponPropertyRune.axiomatic.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneAxiomatic",
        price: 1_400,
        rarity: "common",
        slug: "axiomatic",
        traits: ["evocation", "lawful", "magical"],
    },
    bane: {
        level: 4,
        // name: "PF2E.WeaponPropertyRune.bane.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneBane",
        price: 100,
        rarity: "uncommon",
        slug: "bane",
        traits: ["divination", "magical"],
    },
    bloodbane: {
        level: 8,
        // name: "PF2E.WeaponPropertyRune.bloodbane.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneBloodbane",
        price: 475,
        rarity: "uncommon",
        slug: "bloodbane",
        traits: ["dwarf", "evocation", "magical"],
    },
    bloodthirsty: {
        damage: {
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.bloodthirsty.Note.criticalSuccess" },
            ],
        },
        level: 16,
        // name: "PF2E.WeaponPropertyRune.bloodthirsty.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneBloodthirsty",
        price: 8_500,
        rarity: "uncommon",
        slug: "bloodthirsty",
        traits: ["magical", "necromancy"],
    },
    brilliant: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d4" },
                { damageType: "good", diceNumber: 1, dieSize: "d4", predicate: { all: ["target:trait:fiend"] } },
                {
                    damageType: "positive",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: { any: ["target:trait:undead", "target:negative-healing"] },
                },
            ],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.brilliant.Note.criticalSuccess" }],
        },
        level: 12,
        // name: "PF2E.WeaponPropertyRune.brilliant.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneBrilliant",
        price: 2_000,
        rarity: "common",
        slug: "brilliant",
        traits: ["evocation", "magical"],
    },
    conducting: {
        level: 7,
        // name: "PF2E.WeaponPropertyRune.conducting.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneConducting",
        price: 300,
        rarity: "common",
        slug: "conducting",
        traits: ["evocation", "magical"],
    },
    corrosive: {
        damage: {
            dice: [{ damageType: "acid", diceNumber: 1, dieSize: "d6" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.corrosive.Note.criticalSuccess" }],
        },
        level: 8,
        // name: "PF2E.WeaponPropertyRune.corrosive.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneCorrosive",
        price: 500,
        rarity: "common",
        slug: "corrosive",
        traits: ["acid", "conjuration", "magical"],
    },
    crushing: {
        damage: {
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.crushing.Note.criticalSuccess" }],
        },
        level: 3,
        // name: "PF2E.WeaponPropertyRune.crushing.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneCrushing",
        price: 50,
        rarity: "uncommon",
        slug: "crushing",
        traits: ["magical", "necromancy"],
    },
    cunning: {
        level: 5,
        // name: "PF2E.WeaponPropertyRune.cunning.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneCunning",
        price: 140,
        rarity: "common",
        slug: "cunning",
        traits: ["divination", "magical"],
    },
    dancing: {
        level: 13,
        // name: "PF2E.WeaponPropertyRune.dancing.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneDancing",
        price: 2_700,
        rarity: "uncommon",
        slug: "dancing",
        traits: ["evocation", "magical"],
    },
    disrupting: {
        damage: {
            dice: [
                {
                    damageType: "positive",
                    diceNumber: 1,
                    dieSize: "d6",
                    predicate: { any: ["target:trait:undead", "target:negative-healing"] },
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: { any: ["target:trait:undead", "target:negative-healing"] },
                    text: "PF2E.WeaponPropertyRune.disrupting.Note.criticalSuccess",
                },
            ],
        },
        level: 5,
        // name: "PF2E.WeaponPropertyRune.disrupting.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneDisrupting",
        price: 150,
        rarity: "common",
        slug: "disrupting",
        traits: ["magical", "necromancy"],
    },
    energizing: {
        level: 6,
        // name: "PF2E.WeaponPropertyRune.energizing.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneEnergizing",
        price: 250,
        rarity: "uncommon",
        slug: "energizing",
        traits: ["abjuration", "magical"],
    },
    extending: {
        level: 7,
        // name: "PF2E.WeaponPropertyRune.extending.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneExtending",
        price: 700,
        rarity: "common",
        slug: "extending",
        traits: ["magical", "transmutation"],
    },
    fanged: {
        level: 2,
        // name: "PF2E.WeaponPropertyRune.fanged.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneFanged",
        price: 30,
        rarity: "uncommon",
        slug: "fanged",
        traits: ["magical", "transmutation"],
    },
    fearsome: {
        damage: {
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.fearsome.Note.criticalSuccess" }],
        },
        level: 5,
        // name: "PF2E.WeaponPropertyRune.fearsome.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneFearsome",
        price: 160,
        rarity: "common",
        slug: "fearsome",
        traits: ["emotion", "enchantment", "fear", "magical", "mental"],
    },
    flaming: {
        damage: {
            dice: [{ damageType: "fire", diceNumber: 1, dieSize: "d6" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.flaming.Note.criticalSuccess" }],
        },
        level: 8,
        // name: "PF2E.WeaponPropertyRune.flaming.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneFlaming",
        price: 500,
        rarity: "common",
        slug: "flaming",
        traits: ["conjuration", "fire", "magical"],
    },
    frost: {
        damage: {
            dice: [{ damageType: "cold", diceNumber: 1, dieSize: "d6" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.frost.Note.criticalSuccess" }],
        },
        level: 8,
        // name: "PF2E.WeaponPropertyRune.frost.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneFrost",
        price: 500,
        rarity: "common",
        slug: "frost",
        traits: ["cold", "conjuration", "magical"],
    },
    ghostTouch: {
        damage: {
            notes: [
                { predicate: { all: ["target:trait:incorporeal"] }, text: "PF2E.WeaponPropertyRune.ghostTouch.Note" },
            ],
        },
        level: 4,
        // name: "PF2E.WeaponPropertyRune.ghostTouch.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGhostTouch",
        price: 75,
        rarity: "common",
        slug: "ghostTouch",
        traits: ["magical", "transmutation"],
    },
    greaterAnchoring: {
        damage: {
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterAnchoring.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterAnchoring.Note.success" },
            ],
        },
        level: 18,
        // name: "PF2E.WeaponPropertyRune.greaterAnchoring.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterAnchoring",
        price: 22_000,
        rarity: "uncommon",
        slug: "greaterAnchoring",
        traits: ["abjuration", "magical"],
    },
    greaterBloodbane: {
        level: 13,
        // name: "PF2E.WeaponPropertyRune.greaterBloodbane.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterBloodbane",
        price: 2_800,
        rarity: "uncommon",
        slug: "greaterBloodbane",
        traits: ["dwarf", "evocation", "magical"],
    },
    greaterBrilliant: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d4" },
                { damageType: "good", diceNumber: 1, dieSize: "d4", predicate: { all: ["target:trait:fiend"] } },
                {
                    damageType: "positive",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: { any: ["target:trait:undead", "target:negative-healing"] },
                },
            ],
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterBrilliant.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterBrilliant.Note.success" },
            ],
        },
        level: 18,
        // name: "PF2E.WeaponPropertyRune.greaterBrilliant.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterBrilliant",
        price: 24_000,
        rarity: "common",
        slug: "greaterBrilliant",
        traits: ["evocation", "magical"],
    },
    greaterCorrosive: {
        damage: {
            dice: [{ damageType: "acid", diceNumber: 1, dieSize: "d6" }],
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterCorrosive.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterCorrosive.Note.success" },
            ],
        },
        level: 15,
        // name: "PF2E.WeaponPropertyRune.greaterCorrosive.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterCorrosive",
        price: 6_500,
        rarity: "common",
        slug: "greaterCorrosive",
        traits: ["acid", "conjuration", "magical"],
    },
    greaterCrushing: {
        damage: {
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterCrushing.Note.criticalSuccess" },
            ],
        },
        level: 9,
        // name: "PF2E.WeaponPropertyRune.greaterCrushing.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterCrushing",
        price: 650,
        rarity: "uncommon",
        slug: "greaterCrushing",
        traits: ["magical", "necromancy"],
    },
    greaterDisrupting: {
        damage: {
            dice: [
                {
                    damageType: "positive",
                    diceNumber: 2,
                    dieSize: "d6",
                    predicate: { any: ["target:trait:undead", "target:negative-healing"] },
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: { any: ["target:trait:undead", "target:negative-healing"] },
                    text: "PF2E.WeaponPropertyRune.greaterDisrupting.Note.criticalSuccess",
                },
            ],
        },
        level: 14,
        // name: "PF2E.WeaponPropertyRune.greaterDisrupting.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterDisrupting",
        price: 4_300,
        rarity: "uncommon",
        slug: "greaterDisrupting",
        traits: ["magical", "necromancy"],
    },
    greaterExtending: {
        level: 13,
        // name: "PF2E.WeaponPropertyRune.greaterExtending.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterExtending",
        price: 3_000,
        rarity: "common",
        slug: "greaterExtending",
        traits: ["magical", "transmutation"],
    },
    greaterFanged: {
        level: 8,
        // name: "PF2E.WeaponPropertyRune.greaterFanged.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterFanged",
        price: 425,
        rarity: "uncommon",
        slug: "greaterFanged",
        traits: ["magical", "transmutation"],
    },
    greaterFearsome: {
        damage: {
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterFearsome.Note.criticalSuccess" },
            ],
        },
        level: 12,
        // name: "PF2E.WeaponPropertyRune.greaterFearsome.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterFearsome",
        price: 2_000,
        rarity: "common",
        slug: "greaterFearsome",
        traits: ["emotion", "enchantment", "fear", "magical", "mental"],
    },
    greaterFlaming: {
        damage: {
            dice: [{ damageType: "fire", diceNumber: 1, dieSize: "d6" }],
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterFlaming.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterFlaming.Note.success" },
            ],
        },
        level: 15,
        // name: "PF2E.WeaponPropertyRune.greaterFlaming.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterFlaming",
        price: 6_500,
        rarity: "common",
        slug: "greaterFlaming",
        traits: ["conjuration", "fire", "magical"],
    },
    greaterFrost: {
        damage: {
            dice: [{ damageType: "cold", diceNumber: 1, dieSize: "d6" }],
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterFrost.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterFrost.Note.success" },
            ],
        },
        level: 15,
        // name: "PF2E.WeaponPropertyRune.greaterFrost.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterFrost",
        price: 6_500,
        rarity: "common",
        slug: "greaterFrost",
        traits: ["cold", "conjuration", "magical"],
    },
    greaterHauling: {
        level: 11,
        // name: "PF2E.WeaponPropertyRune.greaterHauling.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterHauling",
        price: 1_300,
        rarity: "uncommon",
        slug: "greaterHauling",
        traits: ["evocation", "magical"],
    },
    greaterImpactful: {
        damage: {
            dice: [{ damageType: "force", diceNumber: 1, dieSize: "d6" }],
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterImpactful.Note.criticalSuccess" },
            ],
        },
        level: 17,
        // name: "PF2E.WeaponPropertyRune.greaterImpactful.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterImpactful",
        price: 15_000,
        rarity: "common",
        slug: "greaterImpactful",
        traits: ["evocation", "force", "magical"],
    },
    greaterShock: {
        damage: {
            dice: [{ damageType: "electricity", diceNumber: 1, dieSize: "d6" }],
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.greaterShock.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterShock.Note.success" },
            ],
        },
        level: 15,
        // name: "PF2E.WeaponPropertyRune.greaterShock.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterShock",
        price: 6_500,
        rarity: "common",
        slug: "greaterShock",
        traits: ["electricity", "evocation", "magical"],
    },
    greaterThundering: {
        damage: {
            dice: [{ damageType: "sonic", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    text: "PF2E.WeaponPropertyRune.greaterThundering.Note.criticalSuccess",
                },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.greaterThundering.Note.success" },
            ],
        },
        level: 15,
        // name: "PF2E.WeaponPropertyRune.greaterThundering.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGreaterThundering",
        price: 6_500,
        rarity: "common",
        slug: "greaterThundering",
        traits: ["evocation", "magical", "sonic"],
    },
    grievous: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:axe"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Axe",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:brawling"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Brawling",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:club"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Club",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:dart"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Dart",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:flail"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Flail",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:hammer"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Hammer",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:knife"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Knife",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:pick"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Pick",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:polearm"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Polearm",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:shield"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Shield",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:sling"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Sling",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:spear"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Spear",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: { all: ["weapon:group:sword"] },
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Sword",
                },
            ],
        },
        level: 9,
        // name: "PF2E.WeaponPropertyRune.grievous.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneGrievous",
        price: 700,
        rarity: "common",
        slug: "grievous",
        traits: ["enchantment", "magical"],
    },
    hauling: {
        level: 6,
        // name: "PF2E.WeaponPropertyRune.hauling.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneHauling",
        price: 225,
        rarity: "uncommon",
        slug: "hauling",
        traits: ["evocation", "magical"],
    },
    holy: {
        damage: {
            dice: [{ damageType: "good", diceNumber: 1, dieSize: "d6", predicate: { all: ["target:trait:evil"] } }],
        },
        level: 11,
        // name: "PF2E.WeaponPropertyRune.holy.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneHoly",
        price: 1_400,
        rarity: "common",
        slug: "holy",
        traits: ["evocation", "good", "magical"],
    },
    hopeful: {
        attack: {
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.hopeful.Note.criticalSuccess" }],
        },
        level: 11,
        // name: "PF2E.WeaponPropertyRune.hopeful.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneHopeful",
        price: 1_200,
        rarity: "uncommon",
        slug: "hopeful",
        traits: ["enchantment", "magical"],
    },
    impactful: {
        damage: {
            dice: [{ damageType: "force", diceNumber: 1, dieSize: "d6" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.impactful.Note.criticalSuccess" }],
        },
        level: 10,
        // name: "PF2E.WeaponPropertyRune.impactful.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneImpactful",
        price: 1_000,
        rarity: "common",
        slug: "impactful",
        traits: ["evocation", "force", "magical"],
    },
    keen: {
        attack: {
            notes: [{ text: "PF2E.WeaponPropertyRune.keen.Note" }],
        },
        level: 13,
        // name: "PF2E.WeaponPropertyRune.keen.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneKeen",
        price: 3_000,
        rarity: "uncommon",
        slug: "keen",
        traits: ["magical", "transmutation"],
    },
    kinWarding: {
        level: 3,
        // name: "PF2E.WeaponPropertyRune.kinWarding.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneKinWarding",
        price: 52,
        rarity: "uncommon",
        slug: "kinWarding",
        traits: ["abjuration", "dwarf", "magical"],
    },
    majorFanged: {
        level: 15,
        // name: "PF2E.WeaponPropertyRune.majorFanged.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneMajorFanged",
        price: 6_000,
        rarity: "uncommon",
        slug: "majorFanged",
        traits: ["magical", "transmutation"],
    },
    pacifying: {
        level: 5,
        // name: "PF2E.WeaponPropertyRune.pacifying.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRunePacifying",
        price: 150,
        rarity: "uncommon",
        slug: "pacifying",
        traits: ["enchantment", "magical"],
    },
    returning: {
        attack: {
            notes: [{ text: "PF2E.WeaponPropertyRune.returning.Note" }],
        },
        level: 3,
        // name: "PF2E.WeaponPropertyRune.returning.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneReturning",
        price: 55,
        rarity: "common",
        slug: "returning",
        traits: ["evocation", "magical"],
    },
    serrating: {
        damage: {
            dice: [{ damageType: "slashing", diceNumber: 1, dieSize: "d4" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.serrating.Note.criticalSuccess" }],
        },
        level: 10,
        // name: "PF2E.WeaponPropertyRune.serrating.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneSerrating",
        price: 1_000,
        rarity: "uncommon",
        slug: "serrating",
        traits: ["evocation", "magical"],
    },
    shifting: {
        level: 6,
        // name: "PF2E.WeaponPropertyRune.shifting.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneShifting",
        price: 225,
        rarity: "common",
        slug: "shifting",
        traits: ["magical", "transmutation"],
    },
    shock: {
        damage: {
            dice: [{ damageType: "electricity", diceNumber: 1, dieSize: "d6" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.shock.Note.criticalSuccess" }],
        },
        level: 8,
        // name: "PF2E.WeaponPropertyRune.shock.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneShock",
        price: 500,
        rarity: "common",
        slug: "shock",
        traits: ["electricity", "conjuration", "magical"],
    },
    speed: {
        level: 16,
        // name: "PF2E.WeaponPropertyRune.speed.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneSpeed",
        price: 10_000,
        rarity: "rare",
        slug: "speed",
        traits: ["magical", "transmutation"],
    },
    spellStoring: {
        level: 13,
        // name: "PF2E.WeaponPropertyRune.spellStoring.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneSpellStoring",
        price: 2_700,
        rarity: "uncommon",
        slug: "spellStoring",
        traits: ["abjuration", "magical"],
    },
    thundering: {
        damage: {
            dice: [{ damageType: "sonic", diceNumber: 1, dieSize: "d6" }],
            notes: [{ outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.thundering.Note.criticalSuccess" }],
        },
        level: 8,
        // name: "PF2E.WeaponPropertyRune.thundering.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneThundering",
        price: 500,
        rarity: "common",
        slug: "thundering",
        traits: ["evocation", "magical", "sonic"],
    },
    unholy: {
        damage: {
            dice: [{ damageType: "evil", diceNumber: 1, dieSize: "d6", predicate: { all: ["target:trait:good"] } }],
        },
        level: 11,
        // name: "PF2E.WeaponPropertyRune.unholy.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneUnholy",
        price: 1_400,
        rarity: "common",
        slug: "unholy",
        traits: ["evil", "evocation", "magical"],
    },
    vorpal: {
        level: 17,
        // name: "PF2E.WeaponPropertyRune.vorpal.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneVorpal",
        price: 15_000,
        rarity: "rare",
        slug: "vorpal",
        traits: ["evocation", "magical"],
    },
    wounding: {
        damage: {
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.WeaponPropertyRune.wounding.Note.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.WeaponPropertyRune.wounding.Note.success" },
            ],
        },
        level: 7,
        // name: "PF2E.WeaponPropertyRune.wounding.Name", // wait for translations to catch up
        name: "PF2E.WeaponPropertyRuneWounding",
        price: 340,
        rarity: "common",
        slug: "wounding",
        traits: ["magical", "necromancy"],
    },
};

export function getPropertyRuneModifiers(runes: WeaponPropertyRuneType[]): DiceModifierPF2e[] {
    return runes.flatMap((rune) => {
        const runeConfig = CONFIG.PF2E.runes.weapon.property[rune];
        if (runeConfig) {
            return runeConfig.damage?.dice ? toModifiers(rune, runeConfig.damage.dice) : [];
        }
        return [];
    });
}

/* -------------------------------------------- */
/*  Rune Valuation                              */
/* -------------------------------------------- */

export interface RuneValuationData {
    level: number;
    price: number;
    rarity: Rarity;
    traits: WeaponTrait[];
    otherTags?: OtherWeaponTag[];
}

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
const POTENCY_RUNE_DATA: Record<OneToFour, RuneValuationData> = {
    1: { level: 2, price: 35, rarity: "common", traits: ["evocation"] },
    2: { level: 10, price: 935, rarity: "common", traits: ["evocation"] },
    3: { level: 16, price: 8935, rarity: "common", traits: ["evocation"] },
    4: { level: 16, price: 8935, rarity: "common", traits: ["evocation"] },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
const STRIKING_RUNE_DATA: Record<StrikingRuneType, RuneValuationData> = {
    striking: { level: 4, price: 65, rarity: "common", traits: ["evocation"] },
    greaterStriking: { level: 12, price: 1065, rarity: "common", traits: ["evocation"] },
    majorStriking: { level: 19, price: 31065, rarity: "common", traits: ["evocation"] },
};

interface WeaponValuationData {
    potency: { 0: null } & Record<OneToFour, RuneValuationData>;
    striking: { "": null } & Record<StrikingRuneType, RuneValuationData>;
}

export const WEAPON_VALUATION_DATA: WeaponValuationData = {
    potency: { 0: null, ...POTENCY_RUNE_DATA },
    striking: { "": null, ...STRIKING_RUNE_DATA },
};
