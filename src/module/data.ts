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
export type ZeroToThree = 0 | 1 | 2 | 3;
export type ZeroToFour = ZeroToThree | 4; // +1!
