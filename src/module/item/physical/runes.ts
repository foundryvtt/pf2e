import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { CreatureTrait } from "@actor/creature/index.ts";
import { DamageDicePF2e, DamageDiceParameters, ModifierAdjustment } from "@actor/modifiers.ts";
import { ResistanceType } from "@actor/types.ts";
import type { ArmorPF2e, MeleePF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { ArmorPropertyRuneType, ResilientRuneType } from "@item/armor/types.ts";
import { SpellTrait } from "@item/spell/types.ts";
import { StrikingRuneType, WeaponPropertyRuneType, WeaponRangeIncrement } from "@item/weapon/types.ts";
import { OneToFour, Rarity, ZeroToFour, ZeroToSix, ZeroToThree } from "@module/data.ts";
import { RollNoteSource } from "@module/notes.ts";
import { StrikeAdjustment } from "@module/rules/synthetics.ts";
import { DegreeOfSuccessAdjustment } from "@system/degree-of-success.ts";
import { PredicatePF2e } from "@system/predication.ts";
import * as R from "remeda";

function getPropertyRuneSlots(item: WeaponPF2e | ArmorPF2e): ZeroToFour {
    const fromMaterial = item.system.material.type === "orichalcum" ? 1 : 0;

    const fromPotency = ABP.isEnabled(item.actor)
        ? // If the item is unowned or on a loot actor, place no limit on slots
          ABP.getAttackPotency(!item.actor || item.actor.isOfType("loot") ? 20 : item.actor.level)
        : item.system.runes.potency;
    return (fromMaterial + fromPotency) as ZeroToFour;
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
    if (!item.isOfType("armor", "shield", "weapon")) {
        return [];
    }

    type ItemRuneData = {
        ""?: number;
        potency?: ZeroToFour;
        resilient?: ZeroToThree;
        reinforcing?: ZeroToSix;
        striking?: ZeroToThree;
        property?: string[];
    };
    const itemRunes: ItemRuneData = item.system.runes;

    type WorkingData = {
        runes: Record<string, Record<number | string, RuneData | null>>;
        weaponRunes: Record<string, Record<number | string, RuneData | null>>;
        secondaryFundamental: "resilient" | "striking" | "";
    };
    const data: WorkingData = item.isOfType("armor")
        ? { runes: RUNE_DATA.armor, weaponRunes: {}, secondaryFundamental: "resilient" }
        : item.isOfType("shield")
          ? { runes: RUNE_DATA.shield, weaponRunes: RUNE_DATA.weapon, secondaryFundamental: "" }
          : { runes: RUNE_DATA.weapon, weaponRunes: {}, secondaryFundamental: "striking" };

    return R.compact(
        item.isOfType("shield")
            ? [
                  data.runes.reinforcing[item.system.runes.reinforcing],
                  data.weaponRunes.potency[item.system.traits.integrated?.runes.potency ?? 0],
                  data.weaponRunes.striking[item.system.traits.integrated?.runes.striking ?? 0],
                  item.system.traits.integrated?.runes.property.map((p) => data.weaponRunes.property[p]) ?? [],
              ].flat()
            : [
                  data.runes.potency[item.system.runes.potency],
                  data.runes[data.secondaryFundamental]?.[itemRunes[data.secondaryFundamental] ?? ""],
                  item.system.runes.property.map((p) => data.runes.property[p]),
              ].flat(),
    );
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

function getPropertyRuneDice(runes: WeaponPropertyRuneType[], options: Set<string>): DamageDicePF2e[] {
    return runes.flatMap((rune) => {
        const runeData = WEAPON_PROPERTY_RUNES[rune];
        return fu.deepClone(runeData.damage?.dice ?? []).map((data) => {
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

interface SecondaryFundamentalRuneData<TSlug extends string> extends RuneData {
    slug: TSlug;
}

interface ReinforcingRuneData extends RuneData {
    hardness: { increase: number; max: number };
    maxHP: { increase: number; max: number };
}

interface FundamentalArmorRuneData {
    potency: Record<ZeroToFour, PotencyRuneData | null>;
    resilient: Record<ZeroToThree, SecondaryFundamentalRuneData<ResilientRuneType> | null>;
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
            traits: [],
        },
        2: {
            name: "PF2E.ArmorPotencyRune2",
            value: 2,
            level: 11,
            price: 1060,
            rarity: "common",
            traits: [],
        },
        3: {
            name: "PF2E.ArmorPotencyRune3",
            value: 3,
            level: 18,
            price: 20_560,
            rarity: "common",
            traits: [],
        },
        4: {
            name: "PF2E.ArmorPotencyRune4",
            value: 4,
            level: 18,
            price: 20_560,
            rarity: "common",
            traits: [],
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
            traits: [],
        },
        2: {
            name: "PF2E.ArmorGreaterResilientRune",
            level: 14,
            price: 3440,
            rarity: "common",
            slug: "greaterResilient",
            traits: [],
        },
        3: {
            name: "PF2E.ArmorMajorResilientRune",
            level: 20,
            price: 49_440,
            rarity: "common",
            slug: "majorResilient",
            traits: [],
        },
    },
};

// striking: "PF2E.ArmorStrikingRune",
// greaterStriking: "PF2E.ArmorGreaterStrikingRune",
// majorStriking: "PF2E.ArmorMajorStrikingRune",

interface FundamentalWeaponRuneData {
    potency: Record<ZeroToFour, PotencyRuneData | null>;
    striking: Record<ZeroToThree, SecondaryFundamentalRuneData<StrikingRuneType> | null>;
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
            traits: [],
        },
        2: {
            name: "PF2E.WeaponPotencyRune2",
            value: 2,
            level: 10,
            price: 935,
            rarity: "common",
            traits: [],
        },
        3: {
            name: "PF2E.WeaponPotencyRune3",
            value: 3,
            level: 16,
            price: 8935,
            rarity: "common",
            traits: [],
        },
        4: {
            name: "PF2E.WeaponPotencyRune4",
            value: 4,
            level: 16,
            price: 8935,
            rarity: "common",
            traits: [],
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
            traits: [],
        },
        2: {
            name: "PF2E.Item.Weapon.Rune.Striking.Greater",
            level: 12,
            price: 1065,
            rarity: "common",
            slug: "greaterStriking",
            traits: [],
        },
        3: {
            name: "PF2E.Item.Weapon.Rune.Striking.Major",
            level: 19,
            price: 31_065,
            rarity: "common",
            slug: "majorStriking",
            traits: [],
        },
    },
};

type FundamentalShieldRuneData = {
    reinforcing: Record<ZeroToSix, ReinforcingRuneData | null>;
};

const FUNDAMENTAL_SHIELD_RUNE_DATA: FundamentalShieldRuneData = {
    reinforcing: {
        0: null,
        1: {
            name: "PF2E.Item.Shield.Rune.Reinforcing.Minor",
            level: 4,
            price: 75,
            rarity: "common",
            traits: ["magical"],
            hardness: { increase: 3, max: 8 },
            maxHP: { increase: 44, max: 64 },
        },
        2: {
            name: "PF2E.Item.Shield.Rune.Reinforcing.Lesser",
            level: 7,
            price: 300,
            rarity: "common",
            traits: ["magical"],
            hardness: { increase: 3, max: 10 },
            maxHP: { increase: 52, max: 80 },
        },
        3: {
            name: "PF2E.Item.Shield.Rune.Reinforcing.Moderate",
            level: 10,
            price: 900,
            rarity: "common",
            traits: ["magical"],
            hardness: { increase: 3, max: 13 },
            maxHP: { increase: 64, max: 104 },
        },
        4: {
            name: "PF2E.Item.Shield.Rune.Reinforcing.Greater",
            level: 13,
            price: 2500,
            rarity: "common",
            traits: ["magical"],
            hardness: { increase: 5, max: 15 },
            maxHP: { increase: 80, max: 120 },
        },
        5: {
            name: "PF2E.Item.Shield.Rune.Reinforcing.Major",
            level: 16,
            price: 8000,
            rarity: "common",
            traits: ["magical"],
            hardness: { increase: 5, max: 17 },
            maxHP: { increase: 84, max: 136 },
        },
        6: {
            name: "PF2E.Item.Shield.Rune.Reinforcing.Supreme",
            level: 19,
            price: 32_000,
            rarity: "common",
            traits: ["magical"],
            hardness: { increase: 7, max: 20 },
            maxHP: { increase: 108, max: 160 },
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
    strikeAdjustments?: Pick<StrikeAdjustment, "adjustTraits" | "adjustWeapon">[];
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
        traits: ["magical"],
    },
    advancing: {
        name: "PF2E.ArmorPropertyRuneAdvancing",
        level: 9,
        price: 625,
        rarity: "common",
        slug: "advancing",
        traits: ["magical"],
    },
    aimAiding: {
        name: "PF2E.ArmorPropertyRuneAimAiding",
        level: 6,
        price: 225,
        rarity: "common",
        slug: "aimAiding",
        traits: ["magical"],
    },
    antimagic: {
        name: "PF2E.ArmorPropertyRuneAntimagic",
        level: 15,
        price: 6500,
        rarity: "uncommon",
        slug: "antimagic",
        traits: ["magical"],
    },
    assisting: {
        name: "PF2E.ArmorPropertyRuneAssisting",
        level: 5,
        price: 125,
        rarity: "common",
        slug: "assisting",
        traits: ["magical"],
    },
    bitter: {
        name: "PF2E.ArmorPropertyRuneBitter",
        level: 9,
        price: 135,
        rarity: "uncommon",
        slug: "bitter",
        traits: ["magical", "poison"],
    },
    coldResistant: {
        name: "PF2E.ArmorPropertyRuneColdResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "coldResistant",
        traits: ["magical"],
    },
    deathless: {
        name: "PF2E.ArmorPropertyRuneDeathless",
        level: 7,
        price: 330,
        rarity: "uncommon",
        slug: "deathless",
        traits: ["healing", "magical"],
    },
    electricityResistant: {
        name: "PF2E.ArmorPropertyRuneElectricityResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "electricityResistant",
        traits: ["magical"],
    },
    energyAdaptive: {
        name: "PF2E.ArmorPropertyRuneEnergyAdaptive",
        level: 6,
        price: 225,
        rarity: "common",
        slug: "energyAdaptive",
        traits: ["magical"],
    },
    ethereal: {
        name: "PF2E.ArmorPropertyRuneEthereal",
        level: 17,
        price: 13_500,
        rarity: "common",
        slug: "ethereal",
        traits: ["magical"],
    },
    fireResistant: {
        name: "PF2E.ArmorPropertyRuneFireResistant",
        level: 8,
        price: 420,
        rarity: "common",
        slug: "fireResistant",
        traits: ["magical"],
    },
    fortification: {
        name: "PF2E.ArmorPropertyRuneFortification",
        level: 12,
        price: 2000,
        rarity: "common",
        slug: "fortification",
        traits: ["magical"],
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
        traits: ["magical"],
    },
    greaterAcidResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterAcidResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterAcidResistant",
        traits: ["magical"],
    },
    greaterAdvancing: {
        name: "PF2E.ArmorPropertyRuneGreaterAdvancing",
        level: 16,
        price: 8000,
        rarity: "common",
        slug: "greaterAdvancing",
        traits: ["magical"],
    },
    greaterColdResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterColdResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterColdResistant",
        traits: ["magical"],
    },
    greaterDread: {
        name: "PF2E.ArmorPropertyRuneGreaterDread",
        level: 18,
        price: 21_000,
        rarity: "uncommon",
        slug: "greaterDread",
        traits: ["emotion", "fear", "magical", "mental", "visual"],
    },
    greaterElectricityResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterElectricityResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterElectricityResistant",
        traits: ["magical"],
    },
    greaterFireResistant: {
        name: "PF2E.ArmorPropertyRuneGreaterFireResistant",
        level: 12,
        price: 1650,
        rarity: "common",
        slug: "greaterFireResistant",
        traits: ["magical"],
    },
    greaterFortification: {
        name: "PF2E.ArmorPropertyRuneGreaterFortification",
        level: 19,
        price: 24_000,
        rarity: "common",
        slug: "greaterFortification",
        traits: ["magical"],
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
        traits: ["magical"],
    },
    greaterShadow: {
        name: "PF2E.ArmorPropertyRuneGreaterShadow",
        level: 9,
        price: 650,
        rarity: "common",
        slug: "greaterShadow",
        traits: ["magical"],
    },
    greaterSlick: {
        name: "PF2E.ArmorPropertyRuneGreaterSlick",
        level: 8,
        price: 450,
        rarity: "common",
        slug: "greaterSlick",
        traits: ["magical"],
    },
    greaterStanching: {
        name: "PF2E.ArmorPropertyRuneGreaterStanching",
        level: 9,
        price: 600,
        rarity: "uncommon",
        slug: "greaterStanching",
        traits: ["magical"],
    },
    greaterQuenching: {
        name: "PF2E.ArmorPropertyRuneGreaterQuenching",
        level: 10,
        price: 1000,
        rarity: "common",
        slug: "greaterQuenching",
        traits: ["magical"],
    },
    greaterSwallowSpike: {
        name: "PF2E.ArmorPropertyRuneGreaterSwallowSpike",
        level: 12,
        price: 1750,
        rarity: "common",
        slug: "greaterSwallowSpike",
        traits: ["magical"],
    },
    greaterWinged: {
        name: "PF2E.ArmorPropertyRuneGreaterWinged",
        level: 19,
        price: 35_000,
        rarity: "common",
        slug: "greaterWinged",
        traits: ["magical"],
    },
    immovable: {
        name: "PF2E.ArmorPropertyRuneImmovable",
        level: 12,
        price: 1800,
        rarity: "uncommon",
        slug: "immovable",
        traits: ["magical"],
    },
    implacable: {
        name: "PF2E.ArmorPropertyRuneImplacable",
        level: 11,
        price: 1200,
        rarity: "uncommon",
        slug: "implacable",
        traits: ["magical"],
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
        traits: ["emotion", "fear", "magical", "mental", "visual"],
    },
    magnetizing: {
        name: "PF2E.ArmorPropertyRuneMagnetizing",
        level: 10,
        price: 900,
        rarity: "common",
        slug: "magnetizing",
        traits: ["magical"],
    },
    majorQuenching: {
        name: "PF2E.ArmorPropertyRuneMajorQuenching",
        level: 14,
        price: 4500,
        rarity: "common",
        slug: "majorQuenching",
        traits: ["magical"],
    },
    majorShadow: {
        name: "PF2E.ArmorPropertyRuneMajorShadow",
        level: 17,
        price: 14_000,
        rarity: "common",
        slug: "majorShadow",
        traits: ["magical"],
    },
    majorSlick: {
        name: "PF2E.ArmorPropertyRuneMajorSlick",
        level: 16,
        price: 9000,
        rarity: "common",
        slug: "majorSlick",
        traits: ["magical"],
    },
    majorStanching: {
        name: "PF2E.ArmorPropertyRuneMajorStanching",
        level: 13,
        price: 2500,
        rarity: "uncommon",
        slug: "majorStanching",
        traits: ["magical"],
    },
    majorSwallowSpike: {
        name: "PF2E.ArmorPropertyRuneMajorSwallowSpike",
        level: 16,
        price: 19_250,
        rarity: "common",
        slug: "majorSwallowSpike",
        traits: ["magical"],
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
        traits: ["emotion", "fear", "magical", "mental", "visual"],
    },
    portable: {
        name: "PF2E.ArmorPropertyRunePortable",
        level: 9,
        price: 660,
        rarity: "common",
        slug: "portable",
        traits: ["magical"],
    },
    quenching: {
        name: "PF2E.ArmorPropertyRuneQuenching",
        level: 6,
        price: 250,
        rarity: "common",
        slug: "quenching",
        traits: ["magical"],
    },
    raiment: {
        name: "PF2E.ArmorPropertyRuneRaiment",
        level: 5,
        price: 140,
        rarity: "common",
        slug: "raiment",
        traits: ["illusion", "magical"],
    },
    ready: {
        name: "PF2E.ArmorPropertyRuneReady",
        level: 6,
        price: 200,
        rarity: "common",
        slug: "ready",
        traits: ["magical"],
    },
    rockBraced: {
        name: "PF2E.ArmorPropertyRuneRockBraced",
        level: 13,
        price: 3000,
        rarity: "rare",
        slug: "rockBraced",
        traits: ["dwarf", "magical", "saggorak"],
    },
    shadow: {
        name: "PF2E.ArmorPropertyRuneShadow",
        level: 5,
        price: 55,
        rarity: "common",
        slug: "shadow",
        traits: ["magical"],
    },
    sinisterKnight: {
        name: "PF2E.ArmorPropertyRuneSinisterKnight",
        level: 8,
        price: 500,
        rarity: "uncommon",
        slug: "sinisterKnight",
        traits: ["illusion", "magical"],
    },
    slick: {
        name: "PF2E.ArmorPropertyRuneSlick",
        level: 5,
        price: 45,
        rarity: "common",
        slug: "slick",
        traits: ["magical"],
    },
    soaring: {
        name: "PF2E.ArmorPropertyRuneSoaring",
        level: 14,
        price: 3750,
        rarity: "common",
        slug: "soaring",
        traits: ["magical"],
    },
    stanching: {
        name: "PF2E.ArmorPropertyRuneStanching",
        level: 5,
        price: 130,
        rarity: "uncommon",
        slug: "stanching",
        traits: ["magical"],
    },
    swallowSpike: {
        name: "PF2E.ArmorPropertyRuneSwallowSpike",
        level: 6,
        price: 200,
        rarity: "common",
        slug: "swallowSpike",
        traits: ["magical"],
    },
    trueQuenching: {
        name: "PF2E.ArmorPropertyRuneTrueQuenching",
        level: 18,
        price: 24_000,
        rarity: "common",
        slug: "trueQuenching",
        traits: ["magical"],
    },
    trueStanching: {
        name: "PF2E.ArmorPropertyRuneTrueStanching",
        level: 17,
        price: 12_500,
        rarity: "uncommon",
        slug: "trueStanching",
        traits: ["magical"],
    },
    winged: {
        name: "PF2E.ArmorPropertyRuneWinged",
        level: 13,
        price: 2500,
        rarity: "common",
        slug: "winged",
        traits: ["magical"],
    },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=27
const WEAPON_PROPERTY_RUNES: { [T in WeaponPropertyRuneType]: WeaponPropertyRuneData<T> } = {
    ancestralEchoing: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.ancestralEchoing.Name",
        price: 9500,
        rarity: "rare",
        slug: "ancestralEchoing",
        traits: ["dwarf", "magical", "saggorak"],
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
        traits: ["magical"],
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
        traits: ["magical"],
    },
    astral: {
        level: 8,
        name: "PF2E.WeaponPropertyRune.astral.Name",
        price: 450,
        rarity: "common",
        slug: "astral",
        traits: ["magical", "spirit"],
        damage: {
            dice: [{ damageType: "spirit", diceNumber: 1, dieSize: "d6" }],
        },
    },
    authorized: {
        level: 3,
        name: "PF2E.WeaponPropertyRune.authorized.Name",
        price: 50,
        rarity: "common",
        slug: "authorized",
        traits: ["magical"],
    },
    bane: {
        level: 4,
        name: "PF2E.WeaponPropertyRune.bane.Name",
        price: 100,
        rarity: "uncommon",
        slug: "bane",
        traits: ["magical"],
    },
    bloodbane: {
        level: 8,
        name: "PF2E.WeaponPropertyRune.bloodbane.Name",
        price: 475,
        rarity: "uncommon",
        slug: "bloodbane",
        traits: ["dwarf", "magical"],
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
        traits: ["magical"],
    },
    brilliant: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d4" },
                {
                    damageType: "spirit",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: ["target:trait:fiend"],
                },
                {
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: ["target:negative-healing"],
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
        traits: ["magical"],
    },
    called: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.called.Name",
        price: 350,
        rarity: "common",
        slug: "called",
        traits: ["magical"],
    },
    coating: {
        level: 9,
        name: "PF2E.WeaponPropertyRune.coating.Name",
        price: 700,
        rarity: "common",
        slug: "coating",
        traits: ["extradimensional", "magical"],
    },
    conducting: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.conducting.Name",
        price: 300,
        rarity: "common",
        slug: "conducting",
        traits: ["magical"],
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
        traits: ["acid", "magical"],
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
        traits: ["magical"],
    },
    cunning: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.cunning.Name",
        price: 140,
        rarity: "common",
        slug: "cunning",
        traits: ["magical"],
    },
    dancing: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.dancing.Name",
        price: 2700,
        rarity: "uncommon",
        slug: "dancing",
        traits: ["magical"],
    },
    decaying: {
        damage: {
            dice: [
                {
                    slug: "decaying",
                    damageType: "void",
                    diceNumber: 1,
                    dieSize: "d4",
                },
                {
                    slug: "decaying-persistent",
                    category: "persistent",
                    damageType: "void",
                    diceNumber: 2,
                    dieSize: "d4",
                    critical: true,
                },
            ],
        },
        level: 8,
        name: "PF2E.WeaponPropertyRune.decaying.Name",
        price: 500,
        rarity: "common",
        slug: "decaying",
        traits: ["acid", "magical", "void"],
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
        traits: ["magical"],
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
        traits: ["magical"],
    },
    disrupting: {
        damage: {
            dice: [
                {
                    category: "persistent",
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d6",
                    predicate: ["target:negative-healing"],
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.disrupting.Name",
                    text: "PF2E.WeaponPropertyRune.disrupting.Note.criticalSuccess",
                    predicate: ["target:negative-healing"],
                },
            ],
        },
        level: 5,
        name: "PF2E.WeaponPropertyRune.disrupting.Name",
        price: 150,
        rarity: "common",
        slug: "disrupting",
        traits: ["magical"],
    },
    earthbinding: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.earthbinding.Name",
        price: 125,
        rarity: "common",
        slug: "earthbinding",
        traits: ["magical"],
    },
    energizing: {
        level: 6,
        name: "PF2E.WeaponPropertyRune.energizing.Name",
        price: 250,
        rarity: "uncommon",
        slug: "energizing",
        traits: ["magical"],
    },
    extending: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.extending.Name",
        price: 700,
        rarity: "common",
        slug: "extending",
        traits: ["magical"],
    },
    fanged: {
        level: 2,
        name: "PF2E.WeaponPropertyRune.fanged.Name",
        price: 30,
        rarity: "uncommon",
        slug: "fanged",
        traits: ["magical"],
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
        traits: ["emotion", "fear", "magical", "mental"],
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
        traits: ["fire", "magical"],
    },
    flurrying: {
        level: 7,
        name: "PF2E.WeaponPropertyRune.flurrying.Name",
        price: 360,
        rarity: "common",
        slug: "flurrying",
        traits: ["magical"],
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
        traits: ["cold", "magical"],
    },
    ghostTouch: {
        level: 4,
        name: "PF2E.WeaponPropertyRune.ghostTouch.Name",
        price: 75,
        rarity: "common",
        slug: "ghostTouch",
        traits: ["magical"],
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
        traits: ["magical"],
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
        traits: ["magical"],
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
        traits: ["magical"],
    },
    greaterAstral: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterAstral.Name",
        price: 6000,
        rarity: "common",
        slug: "greaterAstral",
        traits: ["magical", "spirit"],
        damage: {
            dice: [{ damageType: "spirit", diceNumber: 1, dieSize: "d6" }],
            ignoredResistances: [{ type: "spirit", max: null }],
        },
    },
    greaterBloodbane: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.greaterBloodbane.Name",
        price: 2800,
        rarity: "uncommon",
        slug: "greaterBloodbane",
        traits: ["dwarf", "magical"],
    },
    greaterBrilliant: {
        damage: {
            dice: [
                { damageType: "fire", diceNumber: 1, dieSize: "d4" },
                {
                    damageType: "spirit",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: ["target:trait:fiend"],
                },
                {
                    damageType: "vitality",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: ["target:negative-healing"],
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
                { type: "spirit", max: null },
                { type: "vitality", max: null },
            ],
        },
        level: 18,
        name: "PF2E.WeaponPropertyRune.greaterBrilliant.Name",
        price: 24_000,
        rarity: "common",
        slug: "greaterBrilliant",
        traits: ["magical"],
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
            ignoredResistances: [{ type: "acid", max: null }],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterCorrosive.Name",
        price: 6500,
        rarity: "common",
        slug: "greaterCorrosive",
        traits: ["acid", "magical"],
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
        traits: ["magical"],
    },
    greaterDecaying: {
        damage: {
            dice: [
                {
                    slug: "decaying",
                    damageType: "void",
                    diceNumber: 1,
                    dieSize: "d4",
                },
                {
                    slug: "decaying-persistent",
                    category: "persistent",
                    damageType: "void",
                    diceNumber: 4,
                    dieSize: "d4",
                    critical: true,
                },
            ],
            ignoredResistances: [{ type: "void", max: null }],
        },
        level: 15,
        name: "PF2E.WeaponPropertyRune.greaterDecaying.Name",
        price: 6500,
        rarity: "common",
        slug: "greaterDecaying",
        traits: ["acid", "magical", "void"],
    },
    greaterDisrupting: {
        damage: {
            dice: [
                {
                    category: "persistent",
                    damageType: "vitality",
                    diceNumber: 2,
                    dieSize: "d6",
                    predicate: ["target:negative-healing"],
                },
            ],
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    title: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
                    text: "PF2E.WeaponPropertyRune.greaterDisrupting.Note.criticalSuccess",
                    predicate: ["target:negative-healing"],
                },
            ],
        },
        level: 14,
        name: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
        price: 4300,
        rarity: "uncommon",
        slug: "greaterDisrupting",
        traits: ["magical"],
    },
    greaterExtending: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.greaterExtending.Name",
        price: 3000,
        rarity: "common",
        slug: "greaterExtending",
        traits: ["magical"],
    },
    greaterFanged: {
        level: 8,
        name: "PF2E.WeaponPropertyRune.greaterFanged.Name",
        price: 425,
        rarity: "uncommon",
        slug: "greaterFanged",
        traits: ["magical"],
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
        traits: ["emotion", "fear", "magical", "mental"],
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
        traits: ["fire", "magical"],
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
        traits: ["cold", "magical"],
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
        traits: ["magical"],
    },
    greaterHauling: {
        level: 11,
        name: "PF2E.WeaponPropertyRune.greaterHauling.Name",
        price: 1300,
        rarity: "uncommon",
        slug: "greaterHauling",
        traits: ["magical"],
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
        traits: ["force", "magical"],
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
        traits: ["electricity", "magical"],
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
        traits: ["magical", "sonic"],
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
        traits: ["magical"],
    },
    hauling: {
        level: 6,
        name: "PF2E.WeaponPropertyRune.hauling.Name",
        price: 225,
        rarity: "uncommon",
        slug: "hauling",
        traits: ["magical"],
    },
    holy: {
        level: 11,
        name: "PF2E.WeaponPropertyRune.holy.Name",
        price: 1400,
        rarity: "common",
        slug: "holy",
        traits: ["holy", "magical"],
        damage: {
            dice: [
                {
                    damageType: "spirit",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: [{ not: "target:trait:unholy" }],
                },
                {
                    damageType: "spirit",
                    diceNumber: 2,
                    dieSize: "d4",
                    predicate: ["target:trait:unholy"],
                },
            ],
        },
        strikeAdjustments: [
            {
                adjustTraits: (_weapon: WeaponPF2e | MeleePF2e, traits: ActionTrait[]): void => {
                    if (!traits.includes("holy")) traits.push("holy");
                },
            },
        ],
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
        traits: ["magical"],
    },
    hooked: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.hooked.Name",
        price: 140,
        rarity: "rare",
        slug: "hooked",
        traits: ["magical"],
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
        traits: ["force", "magical"],
    },
    impossible: {
        level: 20,
        name: "PF2E.WeaponPropertyRune.impossible.Name",
        price: 70_000,
        rarity: "common",
        slug: "impossible",
        traits: ["magical"],
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
        traits: ["magical"],
    },
    kinWarding: {
        level: 3,
        name: "PF2E.WeaponPropertyRune.kinWarding.Name",
        price: 52,
        rarity: "uncommon",
        slug: "kinWarding",
        traits: ["dwarf", "magical"],
    },
    majorFanged: {
        level: 15,
        name: "PF2E.WeaponPropertyRune.majorFanged.Name",
        price: 6000,
        rarity: "uncommon",
        slug: "majorFanged",
        traits: ["magical"],
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
        traits: ["magical", "mental"],
    },
    pacifying: {
        level: 5,
        name: "PF2E.WeaponPropertyRune.pacifying.Name",
        price: 150,
        rarity: "uncommon",
        slug: "pacifying",
        traits: ["magical"],
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
        traits: ["magical"],
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
        traits: ["magical"],
    },
    shifting: {
        level: 6,
        name: "PF2E.WeaponPropertyRune.shifting.Name",
        price: 225,
        rarity: "common",
        slug: "shifting",
        traits: ["magical"],
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
        traits: ["electricity", "magical"],
    },
    speed: {
        level: 16,
        name: "PF2E.Actor.Speed.Label",
        price: 10_000,
        rarity: "rare",
        slug: "speed",
        traits: ["magical"],
    },
    spellStoring: {
        level: 13,
        name: "PF2E.WeaponPropertyRune.spellStoring.Name",
        price: 2700,
        rarity: "uncommon",
        slug: "spellStoring",
        traits: ["magical"],
    },
    swarming: {
        level: 9,
        name: "PF2E.WeaponPropertyRune.swarming.Name",
        price: 700,
        rarity: "common",
        slug: "swarming",
        traits: ["magical"],
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
        traits: ["magical", "sonic"],
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
        level: 11,
        name: "PF2E.WeaponPropertyRune.unholy.Name",
        price: 1400,
        rarity: "common",
        slug: "unholy",
        traits: ["unholy", "magical"],
        damage: {
            dice: [
                {
                    damageType: "spirit",
                    diceNumber: 1,
                    dieSize: "d4",
                    predicate: [{ not: "target:trait:holy" }],
                },
                {
                    damageType: "spirit",
                    diceNumber: 2,
                    dieSize: "d4",
                    predicate: ["target:trait:holy"],
                },
            ],
        },
        strikeAdjustments: [
            {
                adjustTraits: (_weapon: WeaponPF2e | MeleePF2e, traits: ActionTrait[]): void => {
                    if (!traits.includes("unholy")) traits.push("unholy");
                },
            },
        ],
    },
    vorpal: {
        level: 17,
        name: "PF2E.WeaponPropertyRune.vorpal.Name",
        price: 15_000,
        rarity: "rare",
        slug: "vorpal",
        traits: ["magical"],
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
        traits: ["magical"],
    },
};

const RUNE_DATA = {
    armor: { ...FUNDAMENTAL_ARMOR_RUNE_DATA, property: ARMOR_PROPERTY_RUNES },
    shield: FUNDAMENTAL_SHIELD_RUNE_DATA,
    weapon: { ...FUNDAMENTAL_WEAPON_RUNE_DATA, property: WEAPON_PROPERTY_RUNES },
};

export {
    RUNE_DATA,
    getPropertyRuneDegreeAdjustments,
    getPropertyRuneDice,
    getPropertyRuneModifierAdjustments,
    getPropertyRuneSlots,
    getPropertyRuneStrikeAdjustments,
    getRuneValuationData,
    prunePropertyRunes,
};
export type { RuneData, WeaponPropertyRuneData };
