import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { CreatureTrait } from "@actor/creature/index.ts";
import { DamageDicePF2e, DamageDiceParameters, ModifierAdjustment } from "@actor/modifiers.ts";
import { ResistanceType } from "@actor/types.ts";
import type { ArmorPF2e, MeleePF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import { ArmorPropertyRuneType, ResilientRuneType } from "@item/armor/types.ts";
import { SpellTrait } from "@item/spell/types.ts";
import { StrikingRuneType, WeaponPropertyRuneType, WeaponRangeIncrement } from "@item/weapon/types.ts";
import { OneToFour, Rarity, ZeroToFour, ZeroToThree } from "@module/data.ts";
import { RollNoteSource } from "@module/notes.ts";
import { StrikeAdjustment } from "@module/rules/synthetics.ts";
import { DegreeOfSuccessAdjustment } from "@system/degree-of-success.ts";
import { PredicatePF2e } from "@system/predication.ts";
import * as R from "remeda";

function getPropertySlots(item: WeaponPF2e | ArmorPF2e): ZeroToFour {
    const fromMaterial = item.system.material.type === "orichalcum" ? 1 : 0;

    const fromPotency = ABP.isEnabled(item.actor)
        ? // If the item is unowned or on a loot actor, place no limit on slots
          ABP.getAttackPotency(!item.actor || item.actor.isOfType("loot") ? 20 : item.actor.level)
        : item.system.runes.potency;
    return (fromMaterial + fromPotency) as ZeroToFour;
}

function getPropertyRunes(item: WeaponPF2e | ArmorPF2e, slots: ZeroToFour): string[] {
    const dictionary = item.isOfType("armor") ? ARMOR_PROPERTY_RUNES : WEAPON_PROPERTY_RUNES;
    return ([1, 2, 3, 4] as const)
        .flatMap((n) => item.system[`propertyRune${n}`].value ?? [])
        .filter((r) => r in dictionary)
        .slice(0, slots);
}

/** Remove duplicate and lesser versions from an array of property runes */
function prunePropertyRunes<T extends string>(runes: (string | null)[], validTypes: Record<T, unknown>): T[];
function prunePropertyRunes(runes: (string | null)[], validTypes: Record<string, unknown>): string[] {
    const runeSet = new Set(runes);
    return Array.from(runeSet).filter(
        (r): r is string =>
            !!r &&
            r in validTypes &&
            !runeSet.has(`greater${r.titleCase()}`) &&
            !runeSet.has(`major${r.replace(/^greater/, "").titleCase()}`) &&
            !runeSet.has(`true${r.replace(/^greater|^major/, "").titleCase()}`),
    );
}

function getRuneValuationData(item: PhysicalItemPF2e): RuneData[] {
    if (!item.isOfType("armor", "weapon") || (item.isOfType("armor") && item.isShield)) {
        return [];
    }

    type WorkingData = {
        runes: Record<string, Record<string | number, RuneData | null>>;
        secondaryFundamental: "resilient" | "striking";
    };
    const itemRunes: ItemRuneData = item.system.runes;

    type ItemRuneData = {
        potency: ZeroToFour;
        resilient?: ZeroToThree;
        striking?: ZeroToThree;
        property: string[];
        effects: string[];
    };
    const data: WorkingData = item.isOfType("armor")
        ? { runes: RUNE_DATA.armor, secondaryFundamental: "resilient" }
        : { runes: RUNE_DATA.weapon, secondaryFundamental: "striking" };

    return [
        data.runes.potency[item.system.runes.potency],
        data.runes[data.secondaryFundamental][itemRunes[data.secondaryFundamental] ?? ""],
        ...item.system.runes.property.map((p) => data.runes.property[p]),
    ].filter((d): d is RuneData => !!d);
}

const strikingRuneValues: Map<StrikingRuneType | null, ZeroToThree | undefined> = new Map([
    ["striking", 1],
    ["greaterStriking", 2],
    ["majorStriking", 3],
]);

function getStrikingDice(itemData: { strikingRune: { value: StrikingRuneType | null } }): ZeroToThree {
    return strikingRuneValues.get(itemData.strikingRune.value) ?? 0;
}

function getPropertyRuneDegreeAdjustments(item: WeaponPF2e): DegreeOfSuccessAdjustment[] {
    return R.uniq(
        R.compact(
            [
                item.system.runes.property.map((p) => WEAPON_PROPERTY_RUNES[p].attack?.dosAdjustments),
                item.system.runes.effects.map((p) => WEAPON_PROPERTY_RUNES[p].attack?.dosAdjustments),
            ].flat(2),
        ),
    );
}

const resilientRuneValues: Map<ResilientRuneType | null, ZeroToThree> = new Map([
    [null, 0],
    ["resilient", 1],
    ["greaterResilient", 2],
    ["majorResilient", 3],
]);

function getResilientBonus(itemData: { resiliencyRune: { value: ResilientRuneType | null } }): ZeroToThree {
    return resilientRuneValues.get(itemData.resiliencyRune.value) ?? 0;
}

function getPropertyRuneDice(runes: WeaponPropertyRuneType[], options: Set<string>): DamageDicePF2e[] {
    return runes.flatMap((rune) => {
        const runeData = WEAPON_PROPERTY_RUNES[rune];
        return deepClone(runeData.damage?.dice ?? []).map((data) => {
            const dice = new DamageDicePF2e({
                selector: "strike-damage",
                slug: rune,
                label: RUNE_DATA.weapon.property[rune]?.name,
                diceNumber: data.diceNumber ?? 1,
                dieSize: data.dieSize ?? "d6",
                damageType: data.damageType,
                category: data.category ?? null,
                predicate: data.predicate,
                critical: data.critical ?? null,
            });
            dice.test(options);
            return dice;
        });
    });
}

function getPropertyRuneStrikeAdjustments(runes: WeaponPropertyRuneType[]): StrikeAdjustment[] {
    return runes.flatMap((r) => RUNE_DATA.weapon.property[r].strikeAdjustments ?? []);
}

function getPropertyRuneModifierAdjustments(runes: WeaponPropertyRuneType[]): ModifierAdjustment[] {
    return runes.flatMap((r) => RUNE_DATA.weapon.property[r].damage?.adjustments ?? []);
}

type RuneDiceProperty = "slug" | "damageType" | "category" | "diceNumber" | "dieSize" | "predicate" | "critical";
type RuneDiceData = Partial<Pick<DamageDiceParameters, RuneDiceProperty>>;
type RuneTrait = SpellTrait | CreatureTrait | "saggorak";

/* -------------------------------------------- */
/*  Rune Valuation                              */
/* -------------------------------------------- */

interface RuneData {
    name: string;
    level: number;
    price: number; // in gp
    rarity: Rarity;
    traits: RuneTrait[];
}

interface PotencyRuneData extends RuneData {
    value: OneToFour;
}

interface SecondaryFundamentalRuneData extends RuneData {
    slug: string;
}

interface FundamentalArmorRuneData {
    potency: Record<ZeroToFour, PotencyRuneData | null>;
    resilient: Record<ZeroToThree, SecondaryFundamentalRuneData | null>;
}

const FUNDAMENTAL_ARMOR_RUNE_DATA: FundamentalArmorRuneData = {
    // https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=24
    potency: {
        0: null,
        1: {
            name: "PF2E.ArmorPotencyRune1",
            value: 1,
            level: 5,
            price: 160,
            rarity: "common",
            traits: ["abjuration"],
        },
        2: {
            name: "PF2E.ArmorPotencyRune2",
            value: 2,
            level: 11,
            price: 1060,
            rarity: "common",
            traits: ["abjuration"],
        },
        3: {
            name: "PF2E.ArmorPotencyRune3",
            value: 3,
            level: 18,
            price: 20_560,
            rarity: "common",
            traits: ["abjuration"],
        },
        4: {
            name: "PF2E.ArmorPotencyRune4",
            value: 4,
            level: 18,
            price: 20_560,
            rarity: "common",
            traits: ["abjuration"],
        },
    },
    resilient: {
        0: null,
        1: {
            name: "PF2E.ArmorResilientRune",
            level: 8,
            price: 340,
            rarity: "common",
            slug: "resilient",
            traits: ["abjuration"],
        },
        2: {
            name: "PF2E.ArmorGreaterResilientRune",
            level: 14,
            price: 3440,
            rarity: "common",
            slug: "greaterResilient",
            traits: ["abjuration"],
        },
        3: {
            name: "PF2E.ArmorMajorResilientRune",
            level: 20,
            price: 49_440,
            rarity: "common",
            slug: "majorResilient",
            traits: ["abjuration"],
        },
    },
};

// striking: "PF2E.ArmorStrikingRune",
// greaterStriking: "PF2E.ArmorGreaterStrikingRune",
// majorStriking: "PF2E.ArmorMajorStrikingRune",

interface FundamentalWeaponRuneData {
    potency: Record<ZeroToFour, PotencyRuneData | null>;
    striking: Record<ZeroToThree, SecondaryFundamentalRuneData | null>;
}
const FUNDAMENTAL_WEAPON_RUNE_DATA: FundamentalWeaponRuneData = {
    // https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
    potency: {
        0: null,
        1: {
            name: "PF2E.WeaponPotencyRune1",
            value: 1,
            level: 2,
            price: 35,
            rarity: "common",
            traits: ["evocation"],
        },
        2: {
            name: "PF2E.WeaponPotencyRune2",
            value: 2,
            level: 10,
            price: 935,
            rarity: "common",
            traits: ["evocation"],
        },
        3: {
            name: "PF2E.WeaponPotencyRune3",
            value: 3,
            level: 16,
            price: 8935,
            rarity: "common",
            traits: ["evocation"],
        },
        4: {
            name: "PF2E.WeaponPotencyRune4",
            value: 4,
            level: 16,
            price: 8935,
            rarity: "common",
            traits: ["evocation"],
        },
    },
    // https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
    striking: {
        0: null,
        1: {
            name: "PF2E.Item.Weapon.Rune.Striking.Striking",
            level: 4,
            price: 65,
            rarity: "common",
            slug: "striking",
            traits: ["evocation"],
        },
        2: {
            name: "PF2E.Item.Weapon.Rune.Striking.Greater",
            level: 12,
            price: 1065,
            rarity: "common",
            slug: "greaterStriking",
            traits: ["evocation"],
        },
        3: {
            name: "PF2E.Item.Weapon.Rune.Striking.Major",
            level: 19,
            price: 31_065,
            rarity: "common",
            slug: "majorStriking",
            traits: ["evocation"],
        },
    },
};

interface PropertyRuneData<TSlug extends string> extends RuneData {
    slug: TSlug;
}

interface ArmorPropertyRuneData<TSlug extends ArmorPropertyRuneType> extends PropertyRuneData<TSlug> {}

interface WeaponPropertyRuneData<TSlug extends WeaponPropertyRuneType> extends PropertyRuneData<TSlug> {
    attack?: {
        /** Degree-of-success adjustments */
        dosAdjustments?: DegreeOfSuccessAdjustment[];
        notes?: RuneNoteData[];
    };
    damage?: {
        dice?: RuneDiceData[];
        notes?: RuneNoteData[];
        adjustments?: ModifierAdjustment[];
        /**
         * A list of resistances this weapon's damage will ignore--not limited to damage from the rune.
         * If `max` is numeric, the resistance ignored will be equal to the lower of the provided maximum and the
         * target's resistance.
         */
        ignoredResistances?: { type: ResistanceType; max: number | null }[];
    };
    strikeAdjustments?: Pick<StrikeAdjustment, "adjustWeapon">[];
}

/** Title and text are mandatory for these notes */
interface RuneNoteData extends Pick<RollNoteSource, "outcome" | "predicate" | "title" | "text"> {
    title: string;
    text: string;
}

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=26
export const ARMOR_PROPERTY_RUNES: { [T in ArmorPropertyRuneType]: ArmorPropertyRuneData<T> } = {
    acidResistant: {
        name: "PF2E.ArmorPropertyRuneAcidResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "acidResistant",
        traits: ["abjuration", "magical"],
    },
    advancing: {
        name: "PF2E.ArmorPropertyRuneAdvancing",
        level: 9,
        price: 625,
        rarity: "common",
        slug: "advancing",
        traits: ["magical", "necromancy"],
    },
    aimAiding: {
        name: "PF2E.ArmorPropertyRuneAimAiding",
        level: 6,
        price: 225,
        rarity: "common",
        slug: "aimAiding",
        traits: ["magical", "transmutation"],
    },
    antimagic: {
        name: "PF2E.ArmorPropertyRuneAntimagic",
        level: 15,
        price: 6500,
        rarity: "uncommon",
        slug: "antimagic",
        traits: ["abjuration", "magical"],
    },
    assisting: {
        name: "PF2E.ArmorPropertyRuneAssisting",
        level: 5,
        price: 125,
        rarity: "common",
        slug: "assisting",
        traits: ["magical", "transmutation"],
    },
    bitter: {
        name: "PF2E.ArmorPropertyRuneBitter",
        level: 9,
        price: 135,
        rarity: "uncommon",
        slug: "bitter",
        traits: ["magical", "poison", "transmutation"],
    },
    coldResistant: {
        name: "PF2E.ArmorPropertyRuneColdResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "coldResistant",
        traits: ["abjuration", "magical"],
    },
    deathless: {
        name: "PF2E.ArmorPropertyRuneDeathless",
        level: 7,
        price: 330,
        rarity: "uncommon",
        slug: "deathless",
        traits: ["healing", "magical", "necromancy"],
    },
    electricityResistant: {
        name: "PF2E.ArmorPropertyRuneElectricityResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "electricityResistant",
        traits: ["abjuration", "magical"],
    },
    energyAdaptive: {
        name: "PF2E.ArmorPropertyRuneEnergyAdaptive",
        level: 6,
        price: 225,
        rarity: "common",
        slug: "energyAdaptive",
        traits: ["magical", "transmutation"],
    },
    ethereal: {
        name: "PF2E.ArmorPropertyRuneEthereal",
        level: 17,
        price: 13_500,
        rarity: "common",
        slug: "ethereal",
        traits: ["conjuration", "magical"],
    },
    fireResistant: {
        name: "PF2E.ArmorPropertyRuneFireResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "fireResistant",
        traits: ["abjuration", "magical"],
    },
    fortification: {
        name: "PF2E.ArmorPropertyRuneFortification",
        level: 12,
        price: 2000,
        rarity: "common",
        slug: "fortification",
        traits: ["abjuration", "magical"],
    },
    glamered: {
        name: "PF2E.ArmorPropertyRuneGlamered",
        level: 5,
        price: 140,
        rarity: "common",
        slug: "glamered",
        traits: ["illusion", "magical"],
    },
    gliding: {
        name: "PF2E.ArmorPropertyRuneGliding",
        level: 8,
        price: 450,
        rarity: "common",
        slug: "gliding",
        traits: ["magical", "transmutation"],
    },
    greaterAcidResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterAcidResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterAcidResistant",
        traits: ["abjuration", "magical"],
    },
    greaterAdvancing: {
        name: "PF2E.ArmorPropertyRuneGreaterAdvancing",
        level: 16,
        price: 8000,
        rarity: "common",
        slug: "greaterAdvancing",
        traits: ["magical", "necromancy"],
    },
    greaterColdResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterColdResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterColdResistant",
        traits: ["abjuration", "magical"],
    },
    greaterDread: {
        name: "PF2E.ArmorPropertyRuneGreaterDread",
        level: 18,
        price: 21_000,
        rarity: "uncommon",
        slug: "greaterDread",
        traits: ["emotion", "enchantment", "fear", "magical", "mental", "visual"],
    },
    greaterElectricityResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterElectricityResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterElectricityResistant",
        traits: ["abjuration", "magical"],
    },
    greaterFireResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterFireResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterFireResistant",
        traits: ["abjuration", "magical"],
    },
    greaterFortification: {
        name: "PF2E.ArmorPropertyRuneGreaterFortification",
        level: 19,
        price: 24_000,
        rarity: "common",
        slug: "greaterFortification",
        traits: ["abjuration", "magical"],
    },
    greaterInvisibility: {
        name: "PF2E.ArmorPropertyRuneGreaterInvisibility",
        level: 10,
        price: 1000,
        rarity: "common",
        slug: "greaterInvisibility",
        traits: ["illusion", "magical"],
    },
    greaterReady: {
        name: "PF2E.ArmorPropertyRuneGreaterReady",
        level: 11,
        price: 1200,
        rarity: "common",
        slug: "greaterReady",
        traits: ["evocation", "magical"],
    },
    greaterShadow: {
        name: "PF2E.ArmorPropertyRuneGreaterShadow",
        level: 9,
        price: 650,
        rarity: "common",
        slug: "greaterShadow",
        traits: ["magical", "transmutation"],
    },
    greaterSlick: {
        name: "PF2E.ArmorPropertyRuneGreaterSlick",
        level: 8,
        price: 450,
        rarity: "common",
        slug: "greaterSlick",
        traits: ["magical", "transmutation"],
    },
    greaterStanching: {
        name: "PF2E.ArmorPropertyRuneGreaterStanching",
        level: 9,
        price: 600,
        rarity: "uncommon",
        slug: "greaterStanching",
        traits: ["magical", "necromancy"],
    },
    greaterQuenching: {
        name: "PF2E.ArmorPropertyRuneGreaterQuenching",
        level: 10,
        price: 1000,
        rarity: "common",
        slug: "greaterQuenching",
        traits: ["abjuration", "magical"],
    },
    greaterSwallowSpike: {
        name: "PF2E.ArmorPropertyRuneGreaterSwallowSpike",
        level: 12,
        price: 1750,
        rarity: "common",
        slug: "greaterSwallowSpike",
        traits: ["magical", "transmutation"],
    },
    greaterWinged: {
        name: "PF2E.ArmorPropertyRuneGreaterWinged",
        level: 19,
        price: 35_000,
        rarity: "common",
        slug: "greaterWinged",
        traits: ["magical", "transmutation"],
    },
    immovable: {
        name: "PF2E.ArmorPropertyRuneImmovable",
        level: 12,
        price: 1800,
        rarity: "uncommon",
        slug: "immovable",
        traits: ["magical", "transmutation"],
    },
    implacable: {
        name: "PF2E.ArmorPropertyRuneImplacable",
        level: 11,
        price: 1200,
        rarity: "uncommon",
        slug: "implacable",
        traits: ["magical", "transmutation"],
    },
    invisibility: {
        name: "PF2E.ArmorPropertyRuneInvisibility",
        level: 8,
        price: 500,
        rarity: "common",
        slug: "invisibility",
        traits: ["illusion", "magical"],
    },
    lesserDread: {
        name: "PF2E.ArmorPropertyRuneLesserDread",
        level: 6,
        price: 225,
        rarity: "uncommon",
        slug: "lesserDread",
        traits: ["emotion", "enchantment", "fear", "magical", "mental", "visual"],
    },
    magnetizing: {
        name: "PF2E.ArmorPropertyRuneMagnetizing",
        level: 10,
        price: 900,
        rarity: "common",
        slug: "magnetizing",
        traits: ["evocation", "magical"],
    },
    majorQuenching: {
        name: "PF2E.ArmorPropertyRuneMajorQuenching",
        level: 14,
        price: 4500,
        rarity: "common",
        slug: "majorQuenching",
        traits: ["abjuration", "magical"],
    },
    majorShadow: {
        name: "PF2E.ArmorPropertyRuneMajorShadow",
        level: 17,
        price: 14_000,
        rarity: "common",
        slug: "majorShadow",
        traits: ["magical", "transmutation"],
    },
    majorSlick: {
        name: "PF2E.ArmorPropertyRuneMajorSlick",
        level: 16,
        price: 9000,
        rarity: "common",
        slug: "majorSlick",
        traits: ["magical", "transmutation"],
    },
    majorStanching: {
        name: "PF2E.ArmorPropertyRuneMajorStanching",
        level: 13,
        price: 2500,
        rarity: "uncommon",
        slug: "majorStanching",
        traits: ["magical", "necromancy"],
    },
    majorSwallowSpike: {
        name: "PF2E.ArmorPropertyRuneMajorSwallowSpike",
        level: 16,
        price: 19_250,
        rarity: "common",
        slug: "majorSwallowSpike",
        traits: ["magical", "transmutation"],
    },
    malleable: {
        name: "PF2E.ArmorPropertyRuneMalleable",
        level: 9,
        price: 650,
        rarity: "common",
        slug: "malleable",
        traits: ["magical", "metal"],
    },
    misleading: {
        name: "PF2E.ArmorPropertyRuneMisleading",
        level: 16,
        price: 8000,
        rarity: "common",
        slug: "misleading",
        traits: ["illusion", "magical"],
    },
    moderateDread: {
        name: "PF2E.ArmorPropertyRuneModerateDread",
        level: 12,
        price: 1800,
        rarity: "uncommon",
        slug: "moderateDread",
        traits: ["emotion", "enchantment", "fear", "magical", "mental", "visual"],
    },
    portable: {
        name: "PF2E.ArmorPropertyRunePortable",
        level: 9,
        price: 660,
        rarity: "common",
        slug: "portable",
        traits: ["magical", "transmutation"],
    },
    quenching: {
        name: "PF2E.ArmorPropertyRuneQuenching",
        level: 6,
        price: 250,
        rarity: "common",
        slug: "quenching",
        traits: ["abjuration", "magical"],
    },
    ready: {
        name: "PF2E.ArmorPropertyRuneReady",
        level: 6,
        price: 200,
        rarity: "common",
        slug: "ready",
        traits: ["evocation", "magical"],
    },
    rockBraced: {
        name: "PF2E.ArmorPropertyRuneRockBraced",
        level: 13,
        price: 3000,
        rarity: "rare",
        slug: "rockBraced",
        traits: ["abjuration", "dwarf", "magical", "saggorak"],
    },
    shadow: {
        name: "PF2E.ArmorPropertyRuneShadow",
        level: 5,
        price: 55,
        rarity: "common",
        slug: "shadow",
        traits: ["magical", "transmutation"],
    },
    sinisterKnight: {
        name: "PF2E.ArmorPropertyRuneSinisterKnight",
        level: 8,
        price: 500,
        rarity: "uncommon",
        slug: "sinisterKnight",
        traits: ["abjuration", "illusion", "magical"],
    },
    slick: {
        name: "PF2E.ArmorPropertyRuneSlick",
        level: 5,
        price: 45,
        rarity: "common",
        slug: "slick",
        traits: ["magical", "transmutation"],
    },
    soaring: {
        name: "PF2E.ArmorPropertyRuneSoaring",
        level: 14,
        price: 3750,
        rarity: "common",
        slug: "soaring",
        traits: ["abjuration", "magical"],
    },
    stanching: {
        name: "PF2E.ArmorPropertyRuneStanching",
        level: 5,
        price: 130,
        rarity: "uncommon",
        slug: "stanching",
        traits: ["magical", "necromancy"],
    },
    swallowSpike: {
        name: "PF2E.ArmorPropertyRuneSwallowSpike",
        level: 6,
        price: 200,
        rarity: "common",
        slug: "swallowSpike",
        traits: ["magical", "transmutation"],
    },
    trueQuenching: {
        name: "PF2E.ArmorPropertyRuneTrueQuenching",
        level: 18,
        price: 24_000,
        rarity: "common",
        slug: "trueQuenching",
        traits: ["abjuration", "magical"],
    },
    trueStanching: {
        name: "PF2E.ArmorPropertyRuneTrueStanching",
        level: 17,
        price: 12_500,
        rarity: "uncommon",
        slug: "trueStanching",
        traits: ["magical", "necromancy"],
    },
    winged: {
        name: "PF2E.ArmorPropertyRuneWinged",
        level: 13,
        price: 2500,
        rarity: "common",
        slug: "winged",
        traits: ["magical", "transmutation"],
    },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=27
const WEAPON_PROPERTY_RUNES: { [T in WeaponPropertyRuneType]: WeaponPropertyRuneData<T> } = {
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
        price: 1400,
        rarity: "common",
        slug: "anarchic",
        traits: ["chaotic", "evocation", "magical"],
    },
    ancestralEchoing: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.ancestralEchoing.Name",
        price: 9500,
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
    ashen: {
        damage: {
            dice: [
                {
                    damageType: "fire",
                    category: "persistent",
                    diceNumber: 1,
                    dieSize: "d4",
                },
            ],
            notes: [
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.ashen.Name",
                    text: "PF2E.WeaponPropertyRune.ashen.Note.success",
                },
            ],
        },
        level: 9,
        name: "PF2E.WeaponPropertyRune.ashen.Name",
        price: 700,
        rarity: "common",
        slug: "ashen",
        traits: ["enchantment", "magical"],
    },
    authorized: {
        level: 3,
        name: "PF2E.WeaponPropertyRune.authorized.Name",
        price: 50,
        rarity: "common",
        slug: "authorized",
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
        price: 1400,
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
        price: 8500,
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
                    predicate: ["target:trait:fiend"],
                },
                {
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: ["target:mode:undead"],
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
        price: 2000,
        rarity: "common",
        slug: "brilliant",
        traits: ["evocation", "magical"],
    },
    called: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.called.Name",
        price: 350,
        rarity: "common",
        slug: "called",
        traits: ["conjuration", "magical"],
    },
    coating: {
        level: 9,
        name: "PF2E.WeaponPropertyRune.coating.Name",
        price: 700,
        rarity: "common",
        slug: "coating",
        traits: ["conjuration", "extradimensional", "magical"],
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
        price: 2700,
        rarity: "uncommon",
        slug: "dancing",
        traits: ["evocation", "magical"],
    },
    deathdrinking: {
        damage: {
            dice: [
                {
                    slug: "deathdrinking-negative",
                    damageType: "void",
                    diceNumber: 1,
                    dieSize: "d6",
                    critical: true,
                    predicate: ["target:mode:living", { not: "target:negative-healing" }],
                },
                {
                    slug: "deathdrinking-positive",
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d6",
                    critical: true,
                    predicate: ["target:negative-healing"],
                },
            ],
        },
        level: 7,
        name: "PF2E.WeaponPropertyRune.deathdrinking.Name",
        price: 360,
        rarity: "rare",
        slug: "deathdrinking",
        traits: ["magical", "necromancy"],
    },
    demolishing: {
        damage: {
            dice: [
                {
                    damageType: "force",
                    category: "persistent",
                    diceNumber: 1,
                    dieSize: "d6",
                    predicate: ["target:trait:construct"],
                },
            ],
        },
        level: 6,
        name: "PF2E.WeaponPropertyRune.demolishing.Name",
        price: 225,
        rarity: "rare",
        slug: "demolishing",
        traits: ["evocation", "magical"],
    },
    disrupting: {
        damage: {
            dice: [
                {
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d6",
                    predicate: ["target:mode:undead"],
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.disrupting.Name",
                    text: "PF2E.WeaponPropertyRune.disrupting.Note.criticalSuccess",
                    predicate: ["target:mode:undead"],
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
    earthbinding: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.earthbinding.Name",
        price: 125,
        rarity: "common",
        slug: "earthbinding",
        traits: ["magical", "transmutation"],
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
    flurrying: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.flurrying.Name",
        price: 360,
        rarity: "common",
        slug: "flurrying",
        traits: ["evocation", "magical"],
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
        level: 4,
        name: "PF2E.WeaponPropertyRune.ghostTouch.Name",
        price: 75,
        rarity: "common",
        slug: "ghostTouch",
        traits: ["magical", "transmutation"],
    },
    giantKilling: {
        damage: {
            dice: [
                {
                    slug: "giantKilling",
                    damageType: "mental",
                    diceNumber: 1,
                    dieSize: "d6",
                    predicate: ["target:trait:giant"],
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["target:trait:giant"],
                    title: "PF2E.WeaponPropertyRune.giantKilling.Name",
                    text: "PF2E.WeaponPropertyRune.giantKilling.Note.criticalSuccess",
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.giantKilling.Name",
        price: 450,
        rarity: "rare",
        slug: "giantKilling",
        traits: ["magical", "necromancy"],
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
    greaterAshen: {
        damage: {
            dice: [
                {
                    damageType: "fire",
                    category: "persistent",
                    diceNumber: 1,
                    dieSize: "d8",
                },
            ],
            notes: [
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterAshen.Name",
                    text: "PF2E.WeaponPropertyRune.greaterAshen.Note.success",
                },
            ],
        },
        level: 16,
        name: "PF2E.WeaponPropertyRune.greaterAshen.Name",
        price: 9000,
        rarity: "common",
        slug: "greaterAshen",
        traits: ["enchantment", "magical"],
    },
    greaterBloodbane: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.greaterBloodbane.Name",
        price: 2800,
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
                    predicate: ["target:trait:fiend"],
                },
                {
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: ["target:mode:undead"],
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
                { type: "vitality", max: null },
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
        price: 6500,
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
                    damageType: "vitality",
                    diceNumber: 2,
                    dieSize: "d6",
                    predicate: ["target:mode:undead"],
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
                    text: "PF2E.WeaponPropertyRune.greaterDisrupting.Note.criticalSuccess",
                    predicate: ["target:mode:undead"],
                },
            ],
        },
        level: 14,
        name: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
        price: 4300,
        rarity: "uncommon",
        slug: "greaterDisrupting",
        traits: ["magical", "necromancy"],
    },
    greaterExtending: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.greaterExtending.Name",
        price: 3000,
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
        price: 2000,
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
        price: 6500,
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
        price: 6500,
        rarity: "common",
        slug: "greaterFrost",
        traits: ["cold", "conjuration", "magical"],
    },
    greaterGiantKilling: {
        damage: {
            dice: [
                {
                    slug: "greaterGiantKilling",
                    damageType: "mental",
                    diceNumber: 2,
                    dieSize: "d6",
                    predicate: ["target:trait:giant"],
                },
            ],
            ignoredResistances: [{ type: "mental", max: null }],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    predicate: ["target:trait:giant"],
                    title: "PF2E.WeaponPropertyRune.greaterGiantKilling.Name",
                    text: "PF2E.WeaponPropertyRune.greaterGiantKilling.Note.criticalSuccess",
                },
            ],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterGiantKilling.Name",
        price: 6000,
        rarity: "rare",
        slug: "greaterGiantKilling",
        traits: ["magical", "necromancy"],
    },
    greaterHauling: {
        level: 11,
        name: "PF2E.WeaponPropertyRune.greaterHauling.Name",
        price: 1300,
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
    greaterRooting: {
        level: 11,
        name: "PF2E.WeaponPropertyRune.greaterRooting.Name",
        price: 1400,
        rarity: "common",
        slug: "greaterRooting",
        traits: ["plant", "magical", "wood"],
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterRooting.Name",
                    text: "PF2E.WeaponPropertyRune.greaterRooting.Note.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    title: "PF2E.WeaponPropertyRune.greaterRooting.Name",
                    text: "PF2E.WeaponPropertyRune.greaterRooting.Note.success",
                },
            ],
        },
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
        price: 6500,
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
        price: 6500,
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
                    test: (options): boolean => new PredicatePF2e("item:group:pick").test(options),
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
        price: 1400,
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
        price: 1200,
        rarity: "uncommon",
        slug: "hopeful",
        traits: ["enchantment", "magical"],
    },
    hooked: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.hooked.Name",
        price: 140,
        rarity: "rare",
        slug: "hooked",
        traits: ["conjuration", "magical"],
        strikeAdjustments: [
            {
                adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                    if (!weapon.system.traits.value.includes("trip")) {
                        weapon.system.traits.value.push("trip");
                    }
                },
            },
        ],
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
        price: 1000,
        rarity: "common",
        slug: "impactful",
        traits: ["evocation", "force", "magical"],
    },
    impossible: {
        level: 20,
        name: "PF2E.WeaponPropertyRune.impossible.Name",
        price: 70_000,
        rarity: "common",
        slug: "impossible",
        traits: ["conjuration", "magical"],
        strikeAdjustments: [
            {
                // Double the base range increment
                adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                    if (weapon.isOfType("weapon") && weapon.system.range && weapon._source.system.range) {
                        const sourceRange = weapon._source.system.range;
                        const preparedRange = weapon.system.range;
                        weapon.system.range = (sourceRange * 2 +
                            Math.abs(preparedRange - sourceRange)) as WeaponRangeIncrement;
                    }
                },
            },
        ],
    },
    keen: {
        attack: {
            dosAdjustments: [
                {
                    adjustments: { success: { label: "PF2E.WeaponPropertyRune.keen.Name", amount: "criticalSuccess" } },
                    predicate: new PredicatePF2e([
                        "check:total:natural:19",
                        { or: ["item:damage:type:slashing", "item:damage:type:piercing"] },
                    ]),
                },
            ],
        },
        level: 13,
        name: "PF2E.WeaponPropertyRune.keen.Name",
        price: 3000,
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
        price: 6000,
        rarity: "uncommon",
        slug: "majorFanged",
        traits: ["magical", "transmutation"],
    },
    majorRooting: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.majorRooting.Name",
        price: 6500,
        rarity: "common",
        slug: "majorRooting",
        traits: ["plant", "magical", "wood"],
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.majorRooting.Name",
                    text: "PF2E.WeaponPropertyRune.majorRooting.Note.criticalSuccess",
                },
            ],
        },
    },
    merciful: {
        strikeAdjustments: [
            {
                adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                    if (!weapon.system.traits.value.includes("nonlethal")) {
                        weapon.system.traits.value.push("nonlethal");
                    }
                },
            },
        ],
        level: 4,
        name: "PF2E.WeaponPropertyRune.merciful.Name",
        price: 70,
        rarity: "common",
        slug: "merciful",
        traits: ["abjuration", "magical", "mental"],
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
    rooting: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.rooting.Name",
        price: 360,
        rarity: "common",
        slug: "rooting",
        traits: ["plant", "magical", "wood"],
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.rooting.Name",
                    text: "PF2E.WeaponPropertyRune.rooting.Note.criticalSuccess",
                },
            ],
        },
    },
    serrating: {
        damage: {
            dice: [{ damageType: "slashing", diceNumber: 1, dieSize: "d4" }],
        },
        level: 10,
        name: "PF2E.WeaponPropertyRune.serrating.Name",
        price: 1000,
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
        price: 2700,
        rarity: "uncommon",
        slug: "spellStoring",
        traits: ["abjuration", "magical"],
    },
    swarming: {
        level: 9,
        name: "PF2E.WeaponPropertyRune.swarming.Name",
        price: 700,
        rarity: "common",
        slug: "swarming",
        traits: ["conjuration", "magical"],
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
    trueRooting: {
        level: 19,
        name: "PF2E.WeaponPropertyRune.trueRooting.Name",
        price: 40_000,
        rarity: "common",
        slug: "trueRooting",
        traits: ["plant", "magical", "wood"],
        damage: {
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.trueRooting.Name",
                    text: "PF2E.WeaponPropertyRune.trueRooting.Note.criticalSuccess",
                },
            ],
        },
    },
    underwater: {
        level: 3,
        name: "PF2E.WeaponPropertyRune.underwater.Name",
        price: 50,
        rarity: "common",
        slug: "underwater",
        traits: ["magical", "water"],
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
        price: 1400,
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

const RUNE_DATA = {
    armor: { ...FUNDAMENTAL_ARMOR_RUNE_DATA, property: ARMOR_PROPERTY_RUNES },
    weapon: { ...FUNDAMENTAL_WEAPON_RUNE_DATA, property: WEAPON_PROPERTY_RUNES },
};

export {
    RUNE_DATA,
    getPropertyRuneDegreeAdjustments,
    getPropertyRuneDice,
    getPropertyRuneModifierAdjustments,
    getPropertyRuneStrikeAdjustments,
    getPropertyRunes,
    getPropertySlots,
    getResilientBonus,
    getRuneValuationData,
    getStrikingDice,
    prunePropertyRunes,
    resilientRuneValues,
};
export type { RuneData, WeaponPropertyRuneData };
