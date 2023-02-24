import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression";
import { DamageDiceParameters, DamageDicePF2e, ModifierAdjustment } from "@actor/modifiers";
import { ResistanceType } from "@actor/types";
import { ArmorCategory, ArmorPF2e, ArmorPropertyRuneType, ArmorTrait, OtherArmorTag, WeaponPF2e } from "@item";
import type { ResilientRuneType } from "@item/armor/types";
import type { OtherWeaponTag, StrikingRuneType, WeaponPropertyRuneType, WeaponTrait } from "@item/weapon/types";
import { OneToFour, OneToThree, Rarity, ZeroToFour, ZeroToThree } from "@module/data";
import { RollNoteSource } from "@module/notes";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { isBlank } from "@util";

function getPropertySlots(item: WeaponPF2e | ArmorPF2e): ZeroToFour {
    const fromMaterial = item.system.preciousMaterial?.value === "orichalcum" ? 1 : 0;
    const fromPotency = ABP.isEnabled(item.actor)
        ? ABP.getAttackPotency(item.actor?.level ?? 1)
        : item.system.runes.potency;
    return (fromMaterial + fromPotency) as ZeroToFour;
}

function getPropertyRunes(item: WeaponPF2e | ArmorPF2e, slots: number): string[] {
    const runes: string[] = [];
    type RuneIndex = "propertyRune1" | "propertyRune2" | "propertyRune3" | "propertyRune4";
    for (let i = 1; i <= slots; i += 1) {
        const rune = item.system[`propertyRune${i}` as RuneIndex]?.value;
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

function getStrikingDice(itemData: { strikingRune: { value: StrikingRuneType | null } }): ZeroToThree {
    return strikingRuneValues.get(itemData.strikingRune.value) ?? 0;
}

const resilientRuneValues: Map<ResilientRuneType | null, ZeroToThree | undefined> = new Map([
    ["resilient", 1],
    ["greaterResilient", 2],
    ["majorResilient", 3],
]);

function getResilientBonus(itemData: { resiliencyRune: { value: ResilientRuneType | null } }): ZeroToThree {
    return resilientRuneValues.get(itemData.resiliencyRune.value) ?? 0;
}

type RuneDiceProperty = "damageType" | "category" | "diceNumber" | "dieSize" | "predicate" | "critical";
type RuneDiceData = Partial<Pick<DamageDiceParameters, RuneDiceProperty>>;

function toDamageDice(rune: WeaponPropertyRuneType, dice: RuneDiceData[]): DamageDicePF2e[] {
    return deepClone(dice).map(
        (d) =>
            new DamageDicePF2e({
                selector: "strike-damage",
                slug: rune,
                label: CONFIG.PF2E.runes.weapon.property[rune]?.name,
                diceNumber: d.diceNumber ?? 1,
                dieSize: d.dieSize ?? "d6",
                damageType: d.damageType,
                category: d.category ?? null,
                predicate: d.predicate,
                critical: d.critical ?? null,
            })
    );
}

interface ArmorPropertyRuneData {
    armorCategoryUsage: ArmorCategory[];
    level: number;
    name: string;
    price: number; // in gp
    rarity: Rarity;
    slug: string;
    traits: ArmorTrait[];
    otherTags?: OtherArmorTag[];
}
interface WeaponPropertyRuneData {
    attack?: {
        notes?: RuneNoteData[];
    };
    damage?: {
        dice?: RuneDiceData[];
        notes?: RuneNoteData[];
        adjustments?: (Omit<ModifierAdjustment, "predicate"> & { predicate?: RawPredicate })[];
        /**
         * A list of resistances this weapon's damage will ignore--not limited to damage from the rune.
         * If `max` is numeric, the resistance ignored will be equal to the lower of the provided maximum and the
         * target's resistance.
         */
        ignoredResistances?: { type: ResistanceType; max: number | null }[];
    };
    level: number;
    name: string;
    price: number; // in gp
    rarity: Rarity;
    slug: string;
    traits: WeaponTrait[];
    otherTags?: OtherWeaponTag[];
}

/** Title and text are mandatory for these notes */
interface RuneNoteData extends Pick<RollNoteSource, "outcome" | "predicate" | "title" | "text"> {
    title: string;
    text: string;
}

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=26
export const ARMOR_PROPERTY_RUNES: Record<ArmorPropertyRuneType, ArmorPropertyRuneData> = {
    advancing: {
        armorCategoryUsage: ["heavy"],
        level: 9,
        name: "PF2E.ArmorPropertyRuneAdvancing",
        price: 625,
        rarity: "common",
        slug: "advancing",
        traits: ["magical", "necromancy"],
    },
    aimAiding: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 6,
        name: "PF2E.ArmorPropertyRuneAimAiding",
        price: 225,
        rarity: "common",
        slug: "aimAiding",
        traits: ["magical", "transmutation"],
    },
    acidEnergyResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneAcidResistant",
        price: 420,
        rarity: "common",
        slug: "acidEnergyResistant",
        traits: ["abjuration", "magical"],
    },
    antimagic: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 15,
        name: "PF2E.ArmorPropertyRuneAntimagic",
        price: 6_500,
        rarity: "uncommon",
        slug: "antimagic",
        traits: ["abjuration", "magical"],
    },
    assisting: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 5,
        name: "PF2E.ArmorPropertyRuneAssisting",
        price: 125,
        rarity: "common",
        slug: "assisting",
        traits: ["magical", "transmutation"],
    },
    bitter: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 9,
        name: "PF2E.ArmorPropertyRuneBitter",
        price: 135,
        rarity: "uncommon",
        slug: "bitter",
        traits: ["healing", "magical", "transmutation"],
    },
    coldEnergyResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneColdResistant",
        price: 420,
        rarity: "common",
        slug: "acidEnergyResistant",
        traits: ["abjuration", "magical"],
    },
    deathless: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 7,
        name: "PF2E.ArmorPropertyRuneDeathless",
        price: 330,
        rarity: "uncommon",
        slug: "deathless",
        traits: ["healing", "magical", "necromancy"],
    },
    electricityEnergyResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneElectricityResistant",
        price: 420,
        rarity: "common",
        slug: "electricityEnergyResistant",
        traits: ["abjuration", "magical"],
    },
    energyAbsorbing: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 11,
        name: "PF2E.ArmorPropertyRuneEnergyAbsorbing",
        price: 1_200,
        rarity: "rare",
        slug: "energyAbsorbing",
        traits: ["abjuration", "magical"],
    },
    energyAdaptive: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 13,
        name: "PF2E.ArmorPropertyRuneEnergyAdaptive",
        price: 2_600,
        rarity: "common",
        slug: "energyAdaptive",
        traits: ["abjuration", "magical"],
    },
    ethereal: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 17,
        name: "PF2E.ArmorPropertyRuneEthereal",
        price: 13_500,
        rarity: "uncommon",
        slug: "ethereal",
        traits: ["conjuration", "magical"],
    },
    fireEnergyResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneFireResistant",
        price: 420,
        rarity: "common",
        slug: "fireEnergyResistant",
        traits: ["abjuration", "magical"],
    },
    fortification: {
        armorCategoryUsage: ["medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneFortification",
        price: 2_000,
        rarity: "common",
        slug: "fortification",
        traits: ["abjuration", "magical"],
    },
    glamered: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 5,
        name: "PF2E.ArmorPropertyRuneGlamered",
        price: 140,
        rarity: "common",
        slug: "glamered",
        traits: ["illusion", "magical"],
    },
    greaterAcidResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneGreaterAcidResistant",
        price: 1_650,
        rarity: "common",
        slug: "greaterAcidResistant",
        traits: ["abjuration", "magical"],
    },
    greaterAdvancing: {
        armorCategoryUsage: ["heavy"],
        level: 16,
        name: "PF2E.ArmorPropertyRuneGreaterAdvancing",
        price: 8_000,
        rarity: "common",
        slug: "greaterAdvancing",
        traits: ["magical", "necromancy"],
    },
    greaterColdResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneGreaterColdResistant",
        price: 1_650,
        rarity: "common",
        slug: "greaterColdResistant",
        traits: ["abjuration", "magical"],
    },
    greaterDread: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 18,
        name: "PF2E.ArmorPropertyRuneGreaterDread",
        price: 21_000,
        rarity: "common",
        slug: "greaterDread",
        traits: ["emotion", "enchantment", "fear", "magical", "mental", "visual"],
    },
    greaterElectricityResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneGreaterElectricityResistant",
        price: 1_650,
        rarity: "common",
        slug: "greaterElectricityResistant",
        traits: ["abjuration", "magical"],
    },
    greaterEnergyAbsorbing: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 15,
        name: "PF2E.ArmorPropertyRuneGreaterEnergyAbsorbing",
        price: 6_000,
        rarity: "rare",
        slug: "greaterEnergyAbsorbing",
        traits: ["abjuration", "magical"],
    },
    greaterFireResistant: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneGreaterFireResistant",
        price: 1_650,
        rarity: "common",
        slug: "greaterFireResistant",
        traits: ["abjuration", "magical"],
    },
    greaterFortification: {
        armorCategoryUsage: ["medium", "heavy"],
        level: 18,
        name: "PF2E.ArmorPropertyRuneGreaterFortification",
        price: 24_000,
        rarity: "common",
        slug: "greaterFortification",
        traits: ["abjuration", "magical"],
    },
    greaterInvisibility: {
        armorCategoryUsage: ["light"],
        level: 10,
        name: "PF2E.ArmorPropertyRuneGreaterInvisibility",
        price: 1_000,
        rarity: "common",
        slug: "energyResistant",
        traits: ["illusion", "magical"],
    },
    greaterQuenching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 10,
        name: "PF2E.ArmorPropertyRuneGreaterQuenching",
        price: 1_000,
        rarity: "common",
        slug: "greaterQuenching",
        traits: ["abjuration", "magical"],
    },
    greaterReady: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 11,
        name: "PF2E.ArmorPropertyRuneGreaterReady",
        price: 1_200,
        rarity: "common",
        slug: "greaterReady",
        traits: ["evocation", "magical"],
    },
    greaterShadow: {
        armorCategoryUsage: ["light", "medium"],
        level: 9,
        name: "PF2E.ArmorPropertyRuneGreaterShadow",
        price: 650,
        rarity: "common",
        slug: "greaterShadow",
        traits: ["magical", "transmutation"],
    },
    greaterSwallowSpike: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneGreaterSwallowSpike",
        price: 1_750,
        rarity: "common",
        slug: "greaterSwallowSpike",
        traits: ["magical", "transmutation"],
    },
    greaterSlick: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneGreaterSlick",
        price: 450,
        rarity: "common",
        slug: "greaterSlick",
        traits: ["magical", "transmutation"],
    },
    greaterStanching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 9,
        name: "PF2E.ArmorPropertyRuneGreaterStanching",
        price: 600,
        rarity: "uncommon",
        slug: "greaterStanching",
        traits: ["magical", "necromancy"],
    },
    greaterWinged: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 19,
        name: "PF2E.ArmorPropertyRuneGreaterWinged",
        price: 35_000,
        rarity: "common",
        slug: "greaterWinged",
        traits: ["magical", "transmutation"],
    },
    gliding: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneGliding",
        price: 450,
        rarity: "common",
        slug: "gliding",
        traits: ["magical", "transmutation"],
    },
    immovable: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneImmovable",
        price: 1_800,
        rarity: "uncommon",
        slug: "immovable",
        traits: ["magical", "transmutation"],
    },
    implacable: {
        armorCategoryUsage: ["medium", "heavy"],
        level: 11,
        name: "PF2E.ArmorPropertyRuneImplacable",
        price: 1_200,
        rarity: "uncommon",
        slug: "implacable",
        traits: ["magical", "transmutation"],
    },
    invisibility: {
        armorCategoryUsage: ["light"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneInvisibility",
        price: 500,
        rarity: "common",
        slug: "invisibility",
        traits: ["illusion", "magical"],
    },
    lesserDread: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 6,
        name: "PF2E.ArmorPropertyRuneDread",
        price: 225,
        rarity: "uncommon",
        slug: "lesserDread",
        traits: ["emotion", "enchantment", "fear", "magical", "mental", "visual"],
    },
    magnetizing: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 10,
        name: "PF2E.ArmorPropertyRuneMagnetizing",
        price: 900,
        rarity: "common",
        slug: "magnetizing",
        traits: ["evocation", "magical"],
    },
    majorQuenching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 14,
        name: "PF2E.ArmorPropertyRuneMajorQuenching",
        price: 4_500,
        rarity: "common",
        slug: "majorQuenching",
        traits: ["abjuration", "magical"],
    },
    majorSlick: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 16,
        name: "PF2E.ArmorPropertyRuneMajorSlick",
        price: 9_000,
        rarity: "common",
        slug: "majorSlick",
        traits: ["magical", "transmutation"],
    },
    majorShadow: {
        armorCategoryUsage: ["light", "medium"],
        level: 17,
        name: "PF2E.ArmorPropertyRuneMajorShadow",
        price: 14_000,
        rarity: "common",
        slug: "majorShadow",
        traits: ["magical", "transmutation"],
    },
    majorSwallowSpike: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 16,
        name: "PF2E.ArmorPropertyRuneMajorSwallowSpike",
        price: 19_250,
        rarity: "common",
        slug: "majorSwallowSpike",
        traits: ["magical", "transmutation"],
    },
    majorStanching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 13,
        name: "PF2E.ArmorPropertyRuneMajorStanching",
        price: 2_500,
        rarity: "uncommon",
        slug: "majorStanching",
        traits: ["magical", "necromancy"],
    },
    misleading: {
        armorCategoryUsage: ["light"],
        level: 16,
        name: "PF2E.ArmorPropertyRuneMisleading",
        price: 8_000,
        rarity: "common",
        slug: "misleading",
        traits: ["illusion", "magical"],
    },
    moderateDread: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 12,
        name: "PF2E.ArmorPropertyRuneModerateDread",
        price: 1_800,
        rarity: "uncommon",
        slug: "moderateDread",
        traits: ["emotion", "enchantment", "fear", "magical", "mental", "visual"],
    },
    portable: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 9,
        name: "PF2E.ArmorPropertyRunePortable",
        price: 660,
        rarity: "common",
        slug: "portable",
        traits: ["magical", "transmutation"],
    },
    quenching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 6,
        name: "PF2E.ArmorPropertyRuneQuenching",
        price: 250,
        rarity: "common",
        slug: "quenching",
        traits: ["abjuration", "magical"],
    },
    ready: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 6,
        name: "PF2E.ArmorPropertyRuneReady",
        price: 200,
        rarity: "common",
        slug: "ready",
        traits: ["evocation", "magical"],
    },
    rockBraced: {
        armorCategoryUsage: ["medium", "heavy"],
        level: 13,
        name: "PF2E.ArmorPropertyRuneRockBraced",
        price: 3_000,
        rarity: "rare",
        slug: "rockBraced",
        traits: ["abjuration", "dwarf", "magical", "saggorak"],
    },
    shadow: {
        armorCategoryUsage: ["light", "medium"],
        level: 5,
        name: "PF2E.ArmorPropertyRuneShadow",
        price: 55,
        rarity: "common",
        slug: "shadow",
        traits: ["magical", "transmutation"],
    },
    sinisterKnight: {
        armorCategoryUsage: ["heavy"],
        level: 8,
        name: "PF2E.ArmorPropertyRuneSinisterKnight",
        price: 500,
        rarity: "uncommon",
        slug: "sinisterKnight",
        traits: ["abjuration", "illusion", "magical"],
    },
    slick: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 5,
        name: "PF2E.ArmorPropertyRuneSlick",
        price: 45,
        rarity: "common",
        slug: "slick",
        traits: ["magical", "transmutation"],
    },
    soaring: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 14,
        name: "PF2E.ArmorPropertyRuneSoaring",
        price: 3_750,
        rarity: "common",
        slug: "soaring",
        traits: ["abjuration", "magical"],
    },
    spellbreaking: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 13,
        name: "PF2E.ArmorPropertyRuneSpellbreaking",
        price: 3_000,
        rarity: "common",
        slug: "spellbreaking",
        traits: ["abjuration", "magical"],
    },
    stanching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 5,
        name: "PF2E.ArmorPropertyRuneStanching",
        price: 130,
        rarity: "uncommon",
        slug: "stanching",
        traits: ["magical", "necromancy"],
    },
    swallowSpike: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 6,
        name: "PF2E.ArmorPropertyRuneSwallowSpike",
        price: 200,
        rarity: "common",
        slug: "swallowSpike",
        traits: ["magical", "transmutation"],
    },
    trueStanching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 17,
        name: "PF2E.ArmorPropertyRuneTrueStanching",
        price: 12_500,
        rarity: "uncommon",
        slug: "trueStanching",
        traits: ["magical", "necromancy"],
    },
    trueQuenching: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 18,
        name: "PF2E.ArmorPropertyRuneTrueQuenching",
        price: 24_000,
        rarity: "common",
        slug: "trueQuenching",
        traits: ["abjuration", "magical"],
    },
    winged: {
        armorCategoryUsage: ["unarmored", "light", "medium", "heavy"],
        level: 13,
        name: "PF2E.ArmorPropertyRuneWinged",
        price: 2_500,
        rarity: "common",
        slug: "winged",
        traits: ["magical", "transmutation"],
    },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=27
export const WEAPON_PROPERTY_RUNES: Record<WeaponPropertyRuneType, WeaponPropertyRuneData> = {
    anarchic: {
        damage: {
            dice: [
                {
                    damageType: "chaotic",
                    diceNumber: 1,
                    dieSize: "d6",
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.anarchic.Name",
                    text: "PF2E.WeaponPropertyRune.anarchic.Note.criticalSuccess",
                },
            ],
        },
        level: 11,
        name: "PF2E.WeaponPropertyRune.anarchic.Name",
        price: 1_400,
        rarity: "common",
        slug: "anarchic",
        traits: ["chaotic", "evocation", "magical"],
    },
    ancestralEchoing: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.ancestralEchoing.Name",
        price: 9_500,
        rarity: "rare",
        slug: "ancestralEchoing",
        traits: ["dwarf", "evocation", "magical", "saggorak"],
    },
    anchoring: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.anchoring.Name",
                    text: "PF2E.WeaponPropertyRune.anchoring.Note.criticalSuccess",
                },
            ],
        },
        level: 10,
        name: "PF2E.WeaponPropertyRune.anchoring.Name",
        price: 900,
        rarity: "uncommon",
        slug: "anchoring",
        traits: ["abjuration", "magical"],
    },
    axiomatic: {
        damage: {
            dice: [
                {
                    damageType: "lawful",
                    diceNumber: 1,
                    dieSize: "d6",
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.axiomatic.Name",
                    text: "PF2E.WeaponPropertyRune.axiomatic.Note.criticalSuccess",
                },
            ],
        },
        level: 11,
        name: "PF2E.WeaponPropertyRune.axiomatic.Name",
        price: 1_400,
        rarity: "common",
        slug: "axiomatic",
        traits: ["evocation", "lawful", "magical"],
    },
    bane: {
        level: 4,
        name: "PF2E.WeaponPropertyRune.bane.Name",
        price: 100,
        rarity: "uncommon",
        slug: "bane",
        traits: ["divination", "magical"],
    },
    bloodbane: {
        level: 8,
        name: "PF2E.WeaponPropertyRune.bloodbane.Name",
        price: 475,
        rarity: "uncommon",
        slug: "bloodbane",
        traits: ["dwarf", "evocation", "magical"],
    },
    bloodthirsty: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.bloodbane.Name",
                    text: "PF2E.WeaponPropertyRune.bloodthirsty.Note.criticalSuccess",
                },
            ],
        },
        level: 16,
        name: "PF2E.WeaponPropertyRune.bloodthirsty.Name",
        price: 8_500,
        rarity: "uncommon",
        slug: "bloodthirsty",
        traits: ["magical", "necromancy"],
    },
    brilliant: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d4" },
                {
                    damageType: "good",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: [{ or: ["target:trait:fiend", { not: "target" }] }],
                },
                {
                    damageType: "positive",
                    diceNumber: 1,
                    dieSize: "d4",
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.brilliant.Name",
                    text: "PF2E.WeaponPropertyRune.brilliant.Note.criticalSuccess",
                },
            ],
        },
        level: 12,
        name: "PF2E.WeaponPropertyRune.brilliant.Name",
        price: 2_000,
        rarity: "common",
        slug: "brilliant",
        traits: ["evocation", "magical"],
    },
    conducting: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.conducting.Name",
        price: 300,
        rarity: "common",
        slug: "conducting",
        traits: ["evocation", "magical"],
    },
    corrosive: {
        damage: {
            dice: [{ damageType: "acid", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.corrosive.Name",
                    text: "PF2E.WeaponPropertyRune.corrosive.Note.criticalSuccess",
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.corrosive.Name",
        price: 500,
        rarity: "common",
        slug: "corrosive",
        traits: ["acid", "conjuration", "magical"],
    },
    crushing: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.crushing.Name",
                    text: "PF2E.WeaponPropertyRune.crushing.Note.criticalSuccess",
                },
            ],
        },
        level: 3,
        name: "PF2E.WeaponPropertyRune.crushing.Name",
        price: 50,
        rarity: "uncommon",
        slug: "crushing",
        traits: ["magical", "necromancy"],
    },
    cunning: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.cunning.Name",
        price: 140,
        rarity: "common",
        slug: "cunning",
        traits: ["divination", "magical"],
    },
    dancing: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.dancing.Name",
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
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.disrupting.Name",
                    text: "PF2E.WeaponPropertyRune.disrupting.Note.criticalSuccess",
                },
            ],
        },
        level: 5,
        name: "PF2E.WeaponPropertyRune.disrupting.Name",
        price: 150,
        rarity: "common",
        slug: "disrupting",
        traits: ["magical", "necromancy"],
    },
    energizing: {
        level: 6,
        name: "PF2E.WeaponPropertyRune.energizing.Name",
        price: 250,
        rarity: "uncommon",
        slug: "energizing",
        traits: ["abjuration", "magical"],
    },
    extending: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.extending.Name",
        price: 700,
        rarity: "common",
        slug: "extending",
        traits: ["magical", "transmutation"],
    },
    fanged: {
        level: 2,
        name: "PF2E.WeaponPropertyRune.fanged.Name",
        price: 30,
        rarity: "uncommon",
        slug: "fanged",
        traits: ["magical", "transmutation"],
    },
    fearsome: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.fearsome.Name",
                    text: "PF2E.WeaponPropertyRune.fearsome.Note.criticalSuccess",
                },
            ],
        },
        level: 5,
        name: "PF2E.WeaponPropertyRune.fearsome.Name",
        price: 160,
        rarity: "common",
        slug: "fearsome",
        traits: ["emotion", "enchantment", "fear", "magical", "mental"],
    },
    flaming: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d6" },
                {
                    damageType: "fire",
                    category: "persistent",
                    diceNumber: 1,
                    dieSize: "d10",
                    critical: true,
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.flaming.Name",
        price: 500,
        rarity: "common",
        slug: "flaming",
        traits: ["conjuration", "fire", "magical"],
    },
    frost: {
        damage: {
            dice: [{ damageType: "cold", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.frost.Name",
                    text: "PF2E.WeaponPropertyRune.frost.Note.criticalSuccess",
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.frost.Name",
        price: 500,
        rarity: "common",
        slug: "frost",
        traits: ["cold", "conjuration", "magical"],
    },
    ghostTouch: {
        damage: {
            notes: [
                {
                    predicate: [{ or: ["target:trait:incorporeal", { not: "target" }] }],
                    title: "PF2E.WeaponPropertyRune.ghostTouch.Name",
                    text: "PF2E.WeaponPropertyRune.ghostTouch.Note",
                },
            ],
        },
        level: 4,
        name: "PF2E.WeaponPropertyRune.ghostTouch.Name",
        price: 75,
        rarity: "common",
        slug: "ghostTouch",
        traits: ["magical", "transmutation"],
    },
    greaterAnchoring: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterAnchoring.Name",
                    text: "PF2E.WeaponPropertyRune.greaterAnchoring.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterAnchoring.Name",
                    text: "PF2E.WeaponPropertyRune.greaterAnchoring.Note.success",
                },
            ],
        },
        level: 18,
        name: "PF2E.WeaponPropertyRune.greaterAnchoring.Name",
        price: 22_000,
        rarity: "uncommon",
        slug: "greaterAnchoring",
        traits: ["abjuration", "magical"],
    },
    greaterBloodbane: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.greaterBloodbane.Name",
        price: 2_800,
        rarity: "uncommon",
        slug: "greaterBloodbane",
        traits: ["dwarf", "evocation", "magical"],
    },
    greaterBrilliant: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d4" },
                {
                    damageType: "good",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: [{ or: ["target:trait:fiend", { not: "target" }] }],
                },
                {
                    damageType: "positive",
                    diceNumber: 1,
                    dieSize: "d4",
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterBrilliant.Name",
                    text: "PF2E.WeaponPropertyRune.greaterBrilliant.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterBrilliant.Name",
                    text: "PF2E.WeaponPropertyRune.greaterBrilliant.Note.success",
                },
            ],
            ignoredResistances: [
                { type: "fire", max: null },
                { type: "good", max: null },
                { type: "positive", max: null },
            ],
        },
        level: 18,
        name: "PF2E.WeaponPropertyRune.greaterBrilliant.Name",
        price: 24_000,
        rarity: "common",
        slug: "greaterBrilliant",
        traits: ["evocation", "magical"],
    },
    greaterCorrosive: {
        damage: {
            dice: [{ damageType: "acid", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterCorrosive.Name",
                    text: "PF2E.WeaponPropertyRune.greaterCorrosive.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterCorrosive.Name",
                    text: "PF2E.WeaponPropertyRune.greaterCorrosive.Note.success",
                },
            ],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterCorrosive.Name",
        price: 6_500,
        rarity: "common",
        slug: "greaterCorrosive",
        traits: ["acid", "conjuration", "magical"],
    },
    greaterCrushing: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterCrushing.Name",
                    text: "PF2E.WeaponPropertyRune.greaterCrushing.Note.criticalSuccess",
                },
            ],
        },
        level: 9,
        name: "PF2E.WeaponPropertyRune.greaterCrushing.Name",
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
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
                    text: "PF2E.WeaponPropertyRune.greaterDisrupting.Note.criticalSuccess",
                },
            ],
        },
        level: 14,
        name: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
        price: 4_300,
        rarity: "uncommon",
        slug: "greaterDisrupting",
        traits: ["magical", "necromancy"],
    },
    greaterExtending: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.greaterExtending.Name",
        price: 3_000,
        rarity: "common",
        slug: "greaterExtending",
        traits: ["magical", "transmutation"],
    },
    greaterFanged: {
        level: 8,
        name: "PF2E.WeaponPropertyRune.greaterFanged.Name",
        price: 425,
        rarity: "uncommon",
        slug: "greaterFanged",
        traits: ["magical", "transmutation"],
    },
    greaterFearsome: {
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterFearsome.Name",
                    text: "PF2E.WeaponPropertyRune.greaterFearsome.Note.criticalSuccess",
                },
            ],
        },
        level: 12,
        name: "PF2E.WeaponPropertyRune.greaterFearsome.Name",
        price: 2_000,
        rarity: "common",
        slug: "greaterFearsome",
        traits: ["emotion", "enchantment", "fear", "magical", "mental"],
    },
    greaterFlaming: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d6" },
                {
                    damageType: "fire",
                    category: "persistent",
                    diceNumber: 2,
                    dieSize: "d10",
                    critical: true,
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterFlaming.Name",
                    text: "PF2E.WeaponPropertyRune.greaterFlaming.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterFlaming.Name",
                    text: "PF2E.WeaponPropertyRune.greaterFlaming.Note.success",
                },
            ],
            ignoredResistances: [{ type: "fire", max: null }],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterFlaming.Name",
        price: 6_500,
        rarity: "common",
        slug: "greaterFlaming",
        traits: ["conjuration", "fire", "magical"],
    },
    greaterFrost: {
        damage: {
            dice: [{ damageType: "cold", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterFrost.Name",
                    text: "PF2E.WeaponPropertyRune.greaterFrost.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterFrost.Name",
                    text: "PF2E.WeaponPropertyRune.greaterFrost.Note.success",
                },
            ],
            ignoredResistances: [{ type: "cold", max: null }],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterFrost.Name",
        price: 6_500,
        rarity: "common",
        slug: "greaterFrost",
        traits: ["cold", "conjuration", "magical"],
    },
    greaterHauling: {
        level: 11,
        name: "PF2E.WeaponPropertyRune.greaterHauling.Name",
        price: 1_300,
        rarity: "uncommon",
        slug: "greaterHauling",
        traits: ["evocation", "magical"],
    },
    greaterImpactful: {
        damage: {
            dice: [{ damageType: "force", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterImpactful.Name",
                    text: "PF2E.WeaponPropertyRune.greaterImpactful.Note.criticalSuccess",
                },
            ],
        },
        level: 17,
        name: "PF2E.WeaponPropertyRune.greaterImpactful.Name",
        price: 15_000,
        rarity: "common",
        slug: "greaterImpactful",
        traits: ["evocation", "force", "magical"],
    },
    greaterShock: {
        damage: {
            dice: [{ damageType: "electricity", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterShock.Name",
                    text: "PF2E.WeaponPropertyRune.greaterShock.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterShock.Name",
                    text: "PF2E.WeaponPropertyRune.greaterShock.Note.success",
                },
            ],
            ignoredResistances: [{ type: "electricity", max: null }],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterShock.Name",
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
                    title: "PF2E.WeaponPropertyRune.greaterThundering.Name",
                    text: "PF2E.WeaponPropertyRune.greaterThundering.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterThundering.Name",
                    text: "PF2E.WeaponPropertyRune.greaterThundering.Note.success",
                },
            ],
            ignoredResistances: [{ type: "sonic", max: null }],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterThundering.Name",
        price: 6_500,
        rarity: "common",
        slug: "greaterThundering",
        traits: ["evocation", "magical", "sonic"],
    },
    grievous: {
        damage: {
            dice: [
                {
                    damageType: "bleed",
                    diceNumber: 1,
                    dieSize: "d6",
                    critical: true,
                    predicate: ["critical-specialization", "item:group:dart"],
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:axe"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Axe",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:brawling"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Brawling",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:club"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Club",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:flail"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Flail",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:hammer"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Hammer",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:knife"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Knife",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:polearm"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Polearm",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:shield"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Shield",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:sling"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Sling",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:spear"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Spear",
                },
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["item:group:sword"],
                    title: "PF2E.WeaponPropertyRune.grievous.Name",
                    text: "PF2E.WeaponPropertyRune.grievous.Note.Sword",
                },
            ],
            adjustments: [
                {
                    slug: "critical-specialization",
                    predicate: ["item:group:pick"],
                    getNewValue: (current) => current * 2,
                },
            ],
        },
        level: 9,
        name: "PF2E.WeaponPropertyRune.grievous.Name",
        price: 700,
        rarity: "common",
        slug: "grievous",
        traits: ["enchantment", "magical"],
    },
    hauling: {
        level: 6,
        name: "PF2E.WeaponPropertyRune.hauling.Name",
        price: 225,
        rarity: "uncommon",
        slug: "hauling",
        traits: ["evocation", "magical"],
    },
    holy: {
        damage: {
            dice: [
                {
                    damageType: "good",
                    diceNumber: 1,
                    dieSize: "d6",
                },
            ],
        },
        level: 11,
        name: "PF2E.WeaponPropertyRune.holy.Name",
        price: 1_400,
        rarity: "common",
        slug: "holy",
        traits: ["evocation", "good", "magical"],
    },
    hopeful: {
        attack: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.hopeful.Name",
                    text: "PF2E.WeaponPropertyRune.hopeful.Note.criticalSuccess",
                },
            ],
        },
        level: 11,
        name: "PF2E.WeaponPropertyRune.hopeful.Name",
        price: 1_200,
        rarity: "uncommon",
        slug: "hopeful",
        traits: ["enchantment", "magical"],
    },
    impactful: {
        damage: {
            dice: [{ damageType: "force", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.impactful.Name",
                    text: "PF2E.WeaponPropertyRune.impactful.Note.criticalSuccess",
                },
            ],
        },
        level: 10,
        name: "PF2E.WeaponPropertyRune.impactful.Name",
        price: 1_000,
        rarity: "common",
        slug: "impactful",
        traits: ["evocation", "force", "magical"],
    },
    keen: {
        attack: {
            notes: [
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.keen.Name",
                    text: "PF2E.WeaponPropertyRune.keen.Note",
                },
            ],
        },
        level: 13,
        name: "PF2E.WeaponPropertyRune.keen.Name",
        price: 3_000,
        rarity: "uncommon",
        slug: "keen",
        traits: ["magical", "transmutation"],
    },
    kinWarding: {
        level: 3,
        name: "PF2E.WeaponPropertyRune.kinWarding.Name",
        price: 52,
        rarity: "uncommon",
        slug: "kinWarding",
        traits: ["abjuration", "dwarf", "magical"],
    },
    majorFanged: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.majorFanged.Name",
        price: 6_000,
        rarity: "uncommon",
        slug: "majorFanged",
        traits: ["magical", "transmutation"],
    },
    pacifying: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.pacifying.Name",
        price: 150,
        rarity: "uncommon",
        slug: "pacifying",
        traits: ["enchantment", "magical"],
    },
    returning: {
        attack: {
            notes: [
                { title: "PF2E.WeaponPropertyRune.returning.Name", text: "PF2E.WeaponPropertyRune.returning.Note" },
            ],
        },
        level: 3,
        name: "PF2E.WeaponPropertyRune.returning.Name",
        price: 55,
        rarity: "common",
        slug: "returning",
        traits: ["evocation", "magical"],
    },
    serrating: {
        damage: {
            dice: [{ damageType: "slashing", diceNumber: 1, dieSize: "d4" }],
        },
        level: 10,
        name: "PF2E.WeaponPropertyRune.serrating.Name",
        price: 1_000,
        rarity: "uncommon",
        slug: "serrating",
        traits: ["evocation", "magical"],
    },
    shifting: {
        level: 6,
        name: "PF2E.WeaponPropertyRune.shifting.Name",
        price: 225,
        rarity: "common",
        slug: "shifting",
        traits: ["magical", "transmutation"],
    },
    shock: {
        damage: {
            dice: [{ damageType: "electricity", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.shock.Name",
                    text: "PF2E.WeaponPropertyRune.shock.Note.criticalSuccess",
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.shock.Name",
        price: 500,
        rarity: "common",
        slug: "shock",
        traits: ["electricity", "conjuration", "magical"],
    },
    speed: {
        level: 16,
        name: "PF2E.WeaponPropertyRune.speed.Name",
        price: 10_000,
        rarity: "rare",
        slug: "speed",
        traits: ["magical", "transmutation"],
    },
    spellStoring: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.spellStoring.Name",
        price: 2_700,
        rarity: "uncommon",
        slug: "spellStoring",
        traits: ["abjuration", "magical"],
    },
    thundering: {
        damage: {
            dice: [{ damageType: "sonic", diceNumber: 1, dieSize: "d6" }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.thundering.Name",
                    text: "PF2E.WeaponPropertyRune.thundering.Note.criticalSuccess",
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.thundering.Name",
        price: 500,
        rarity: "common",
        slug: "thundering",
        traits: ["evocation", "magical", "sonic"],
    },
    unholy: {
        damage: {
            dice: [
                {
                    damageType: "evil",
                    diceNumber: 1,
                    dieSize: "d6",
                },
            ],
        },
        level: 11,
        name: "PF2E.WeaponPropertyRune.unholy.Name",
        price: 1_400,
        rarity: "common",
        slug: "unholy",
        traits: ["evil", "evocation", "magical"],
    },
    vorpal: {
        level: 17,
        name: "PF2E.WeaponPropertyRune.vorpal.Name",
        price: 15_000,
        rarity: "rare",
        slug: "vorpal",
        traits: ["evocation", "magical"],
    },
    wounding: {
        damage: {
            dice: [{ damageType: "bleed", diceNumber: 1, dieSize: "d6" }],
        },
        level: 7,
        name: "PF2E.WeaponPropertyRune.wounding.Name",
        price: 340,
        rarity: "common",
        slug: "wounding",
        traits: ["magical", "necromancy"],
    },
};

function getPropertyRuneDice(runes: WeaponPropertyRuneType[]): DamageDicePF2e[] {
    return runes.flatMap((rune) => {
        const runeData = CONFIG.PF2E.runes.weapon.property[rune];
        return toDamageDice(rune, runeData.damage?.dice ?? []);
    });
}

function getPropertyRuneAdjustments(runes: WeaponPropertyRuneType[]): ModifierAdjustment[] {
    return runes.flatMap(
        (rune) =>
            CONFIG.PF2E.runes.weapon.property[rune].damage?.adjustments?.map(
                (a): ModifierAdjustment => ({ ...a, predicate: new PredicatePF2e(a.predicate ?? []) })
            ) ?? []
    );
}

/* -------------------------------------------- */
/*  Rune Valuation                              */
/* -------------------------------------------- */

interface RuneValuationData {
    level: number;
    price: number;
    rarity: Rarity;
    traits: WeaponTrait[] | ArmorTrait[];
    otherTags?: OtherWeaponTag[] | OtherArmorTag[];
}

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=24
const ARMOR_POTENCY_RUNE_DATA: Record<OneToFour, RuneValuationData> = {
    1: { level: 5, price: 160, rarity: "common", traits: ["abjuration"] },
    2: { level: 11, price: 1060, rarity: "common", traits: ["abjuration"] },
    3: { level: 18, price: 20560, rarity: "common", traits: ["abjuration"] },
    4: { level: 18, price: 20560, rarity: "common", traits: ["abjuration"] },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=24
const RESILIENT_RUNE_DATA: Record<OneToThree, RuneValuationData> = {
    1: { level: 8, price: 340, rarity: "common", traits: ["abjuration"] },
    2: { level: 14, price: 3440, rarity: "common", traits: ["abjuration"] },
    3: { level: 20, price: 49440, rarity: "common", traits: ["abjuration"] },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
const WEAPON_POTENCY_RUNE_DATA: Record<OneToFour, RuneValuationData> = {
    1: { level: 2, price: 35, rarity: "common", traits: ["evocation"] },
    2: { level: 10, price: 935, rarity: "common", traits: ["evocation"] },
    3: { level: 16, price: 8935, rarity: "common", traits: ["evocation"] },
    4: { level: 16, price: 8935, rarity: "common", traits: ["evocation"] },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
const STRIKING_RUNE_DATA: Record<OneToThree, RuneValuationData> = {
    1: { level: 4, price: 65, rarity: "common", traits: ["evocation"] },
    2: { level: 12, price: 1065, rarity: "common", traits: ["evocation"] },
    3: { level: 19, price: 31065, rarity: "common", traits: ["evocation"] },
};

interface ArmorValuationData {
    potency: { 0: null } & Record<OneToFour, RuneValuationData>;
    resilient: { 0: null } & Record<OneToThree, RuneValuationData>;
}

interface WeaponValuationData {
    potency: { 0: null } & Record<OneToFour, RuneValuationData>;
    striking: { 0: null } & Record<OneToThree, RuneValuationData>;
}

const ARMOR_VALUATION_DATA: ArmorValuationData = {
    potency: { 0: null, ...ARMOR_POTENCY_RUNE_DATA },
    resilient: { 0: null, ...RESILIENT_RUNE_DATA },
};


const WEAPON_VALUATION_DATA: WeaponValuationData = {
    potency: { 0: null, ...WEAPON_POTENCY_RUNE_DATA },
    striking: { 0: null, ...STRIKING_RUNE_DATA },
};

export {
    ArmorPropertyRuneData,
    ARMOR_VALUATION_DATA,
    RuneValuationData,
    WEAPON_VALUATION_DATA,
    WeaponPropertyRuneData,
    getPropertyRuneAdjustments,
    getPropertyRuneDice,
    getPropertyRunes,
    getPropertySlots,
    getResilientBonus,
    getStrikingDice,
};
