/** The size property of creatures and equipment */
export const SIZES = ["tiny", "sm", "med", "lg", "huge", "grg"] as const;
export type Size = typeof SIZES[number];

/** The rarity trait of creatures, equipment, spells, etc. */
export const RARITIES = ["common", "uncommon", "rare", "unique"] as const;
export type Rarity = typeof RARITIES[number];

export interface ValuesList<T extends string = string> {
    value: T[];
    custom: string;
}

/** Generic { value, label, type } type used in various places in actor/items types. */
export interface LabeledValue {
    label: string;
    value: number | string;
    type: string;
    exceptions?: string;
}
export interface LabeledString extends LabeledValue {
    value: string;
}
export interface LabeledNumber extends LabeledValue {
    value: number;
}

/** Literal numeric types */
export type ZeroToTwo = 0 | 1 | 2;
export type ZeroToThree = ZeroToTwo | 3; // +1!
export type OneToThree = Exclude<ZeroToThree, 0>;
export type TwoToThree = Exclude<OneToThree, 1>;
export type ZeroToFour = ZeroToThree | 4;
export type OneToFour = Exclude<ZeroToFour, 0>;
export type ZeroToFive = ZeroToFour | 5;
export type OneToFive = Exclude<ZeroToFive, 0>;
export type ZeroToTen = ZeroToFour | 5 | 6 | 7 | 8 | 9 | 10;
export type OneToTen = Exclude<ZeroToTen, 0>;
export type ZeroToEleven = ZeroToTen | 11;

export interface ValueAndMax {
    value: number;
    max?: number;
}

export function goesToEleven(value: number): value is ZeroToEleven {
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
        datetime: string;
        version: {
            schema: number | null;
            system?: string;
            foundry?: string;
        };
    } | null;
}

export type DocumentSchemaRecord = NewDocumentSchemaRecord | MigratedDocumentSchemaRecord;

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
