import { ActorPF2e, ItemPF2e } from "@module/documents.ts";

/** The size property of creatures and equipment */
const SIZES = ["tiny", "sm", "med", "lg", "huge", "grg"] as const;
const SIZE_SLUGS = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;

type Size = (typeof SIZES)[number];

/** The rarity trait of creatures, equipment, spells, etc. */
const RARITIES = ["common", "uncommon", "rare", "unique"] as const;
type Rarity = (typeof RARITIES)[number];

interface ValuesList<T extends string = string> {
    value: T[];
    custom: string;
}

/** Generic { value, label, type } type used in various places in actor/items types. */
interface LabeledValue {
    label: string;
    value: number | string;
    type: string;
}

interface LabeledString extends LabeledValue {
    value: string;
}
interface LabeledNumber extends LabeledValue {
    value: number;
}

interface TypeAndValue<TType extends string> {
    type: TType;
    value: number;
}

interface TraitsWithRarity<T extends string> {
    value: T[];
    rarity: Rarity;
}

/** Literal numeric types */
type ZeroToTwo = 0 | 1 | 2;
type ZeroToThree = ZeroToTwo | 3; // +1!
type OneToThree = Exclude<ZeroToThree, 0>;
type TwoToThree = Exclude<OneToThree, 1>;
type ZeroToFour = ZeroToThree | 4;
type OneToFour = Exclude<ZeroToFour, 0>;
type ZeroToFive = ZeroToFour | 5;
type OneToFive = OneToThree | Extract<ZeroToFive, 4 | 5>;
type ZeroToTen = ZeroToFive | 6 | 7 | 8 | 9 | 10;
type OneToTen = Exclude<ZeroToTen, 0>;
type ZeroToEleven = ZeroToTen | 11;
// Sorry

interface ValueAndMaybeMax {
    value: number;
    max?: number;
}

type ValueAndMax = Required<ValueAndMaybeMax>;

function goesToEleven(value: number): value is ZeroToEleven {
    return value >= 0 && value <= 11;
}

/** The tracked schema data of actors and items */
interface NewDocumentSchemaRecord {
    version: null;
    lastMigration: null;
}

interface MigratedDocumentSchemaRecord {
    version: number;
    lastMigration: {
        version: {
            schema: number | null;
            system?: string;
            foundry?: string;
        };
    } | null;
}

type DocumentSchemaRecord = NewDocumentSchemaRecord | MigratedDocumentSchemaRecord;

export const PROFICIENCY_RANKS = ["untrained", "trained", "expert", "master", "legendary"] as const;

export const MATH_FUNCTION_NAMES: Set<MathFunctionName> = new Set([
    "abs",
    "acos",
    "acosh",
    "asin",
    "asinh",
    "atan",
    "atan2",
    "atanh",
    "cbrt",
    "ceil",
    "clamped",
    "clz32",
    "cos",
    "cosh",
    "exp",
    "expm1",
    "floor",
    "fround",
    "hypot",
    "imul",
    "log",
    "log10",
    "log1p",
    "log2",
    "max",
    "min",
    "normalizeDegrees",
    "normalizeRadians",
    "pow",
    "random",
    "round",
    "roundDecimals",
    "safeEval",
    "sign",
    "sin",
    "sinh",
    "sqrt",
    "tan",
    "tanh",
    "toDegrees",
    "toRadians",
    "trunc",
] as const);

type EnfolderableDocumentPF2e =
    | ActorPF2e<null>
    | ItemPF2e<null>
    | Exclude<EnfolderableDocument, Actor<null> | Item<null>>;

export {
    DocumentSchemaRecord,
    EnfolderableDocumentPF2e,
    LabeledNumber,
    LabeledString,
    LabeledValue,
    OneToFive,
    OneToFour,
    OneToTen,
    OneToThree,
    RARITIES,
    Rarity,
    SIZES,
    SIZE_SLUGS,
    Size,
    TraitsWithRarity,
    TwoToThree,
    TypeAndValue,
    ValueAndMax,
    ValueAndMaybeMax,
    ValuesList,
    ZeroToEleven,
    ZeroToFive,
    ZeroToFour,
    ZeroToTen,
    ZeroToThree,
    ZeroToTwo,
    goesToEleven,
};
