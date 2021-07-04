/** The size property of creatures and equipment */
export const SIZES = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'] as const;
export type Size = typeof SIZES[number];

/** The rarity trait of creatures, equipment, spells, etc. */
export const RARITIES = ['common', 'uncommon', 'rare', 'unique'] as const;
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
export type ZeroToFour = ZeroToThree | 4;
export type OneToFour = Exclude<ZeroToFour, 0>;
export type ZeroToTen = ZeroToFour | 5 | 6 | 7 | 8 | 9 | 10;
export type OneToTen = Exclude<ZeroToTen, 0>;
export type ZeroToEleven = ZeroToTen | 11;

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
    };
}

export type DocumentSchemaRecord = NewDocumentSchemaRecord | MigratedDocumentSchemaRecord;
