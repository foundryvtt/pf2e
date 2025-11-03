import type { ActorPF2e } from "@actor";
import type { MathFunctionName } from "@client/dice/terms/function.d.mts";
import type { EnfolderableDocument } from "@client/documents/folder.d.mts";
import type * as fields from "@common/data/fields.d.mts";
import type { ItemPF2e } from "@item";

/** The size property of creatures and equipment */
const SIZES = Object.freeze(["tiny", "sm", "med", "lg", "huge", "grg"] as const);
const SIZE_SLUGS = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;

type Size = (typeof SIZES)[number];

/** The rarity trait of creatures, equipment, spells, etc. */
const RARITIES = Object.freeze(["common", "uncommon", "rare", "unique"] as const);
type Rarity = (typeof RARITIES)[number];

interface ValuesList<T extends string = string> {
    value: T[];
}

interface LabeledValueAndMax extends ValueAndMax {
    label: string;
}

interface LabeledNumber {
    label: string;
    value: number;
    type: string;
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
type OneToFive = OneToFour | Extract<ZeroToFive, 5>;
type ZeroToSix = ZeroToFive | 6;
type OneToSix = Exclude<ZeroToSix, 0>;
type ZeroToTen = ZeroToFive | 6 | 7 | 8 | 9 | 10;
type OneToTen = Exclude<ZeroToTen, 0>;
type ZeroToEleven = ZeroToTen | 11;
// Sorry

interface ValueAndMaybeMax {
    value: number;
    max?: number;
}

interface ValueAndMax extends Required<ValueAndMaybeMax> {}

function goesToEleven(value: number): value is ZeroToEleven {
    return value >= 0 && value <= 11;
}

/** The tracked schema data of actors and items */
interface NewDocumentMigrationRecord {
    version: null;
    previous: null;
}

type MigrationDataField = fields.SchemaField<{
    version: fields.NumberField<number, number, true, true, true>;
    previous: fields.SchemaField<
        {
            foundry: fields.StringField<string, string, true, true, true>;
            system: fields.StringField<string, string, true, true, true>;
            schema: fields.NumberField<number, number, true, true, true>;
        },
        { foundry: string | null; system: string | null; schema: number | null },
        { foundry: string | null; system: string | null; schema: number | null },
        true,
        true,
        true
    >;
}>;

type MigratedDocumentMigrationRecord = fields.SourceFromDataField<MigrationDataField>;

type MigrationRecord = NewDocumentMigrationRecord | MigratedDocumentMigrationRecord;

interface PublicationData {
    title: string;
    authors: string;
    license: "ORC" | "OGL";
    remaster: boolean;
}

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

export { goesToEleven, RARITIES, SIZE_SLUGS, SIZES };
export type {
    EnfolderableDocumentPF2e,
    LabeledNumber,
    LabeledValueAndMax,
    MigrationDataField,
    MigrationRecord,
    OneToFive,
    OneToFour,
    OneToSix,
    OneToTen,
    OneToThree,
    PublicationData,
    Rarity,
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
    ZeroToSix,
    ZeroToTen,
    ZeroToThree,
    ZeroToTwo,
};
