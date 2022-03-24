import { SaveType } from "@actor/data";
import { AbilityString } from "@actor/data/base";
import { ItemLevelData, ItemSystemData, ItemTraits } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { DamageType } from "@system/damage";
import { ValuesList, OneToTen, ValueAndMax } from "@module/data";
import type { SpellPF2e } from "@item";
import { MAGIC_SCHOOLS } from "./values";

export type SpellSource = BaseNonPhysicalItemSource<"spell", SpellSystemSource>;

export class SpellData extends BaseNonPhysicalItemData<SpellPF2e> {
    /** Prepared data */
    isCantrip!: boolean;
    isFocusSpell!: boolean;
    isRitual!: boolean;

    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/spell.svg";
}

export interface SpellData extends Omit<SpellSource, "effects" | "flags"> {
    type: SpellSource["type"];
    data: SpellSource["data"];
    readonly _source: SpellSource;
}

export type MagicSchool = typeof MAGIC_SCHOOLS[number];

export type SpellTrait = keyof ConfigPF2e["PF2E"]["spellTraits"] | MagicSchool | MagicTradition;
export type SpellTraits = ItemTraits<SpellTrait>;
type SpellDamageCategory = keyof ConfigPF2e["PF2E"]["damageCategories"];

export interface SpellDamageType {
    value: DamageType;
    subtype?: "persistent" | "splash";
    categories: SpellDamageCategory[];
}

export interface SpellDamage {
    value: string;
    applyMod?: boolean;
    type: SpellDamageType;
}

export interface SpellSystemSource extends ItemSystemData, ItemLevelData {
    traits: SpellTraits;
    level: {
        value: OneToTen;
    };
    spellType: {
        value: keyof ConfigPF2e["PF2E"]["spellTypes"];
    };
    category: {
        value: keyof ConfigPF2e["PF2E"]["spellCategories"];
    };
    traditions: ValuesList<MagicTradition>;
    school: {
        value: MagicSchool;
    };
    components: {
        focus: boolean;
        material: boolean;
        somatic: boolean;
        verbal: boolean;
    };
    materials: {
        value: string;
    };
    target: {
        value: string;
    };
    range: {
        value: string;
    };
    area: {
        value: keyof ConfigPF2e["PF2E"]["areaSizes"];
        areaType: keyof ConfigPF2e["PF2E"]["areaTypes"];
    };
    time: {
        value: string;
    };
    duration: {
        value: string;
    };
    damage: {
        value: Record<string, SpellDamage>;
    };
    scaling?: {
        interval: number;
        damage: Record<string, string>;
    };
    save: {
        basic: string;
        value: SaveType | "";
        dc?: number;
        str?: string;
    };
    sustained: {
        value: false;
    };
    cost: {
        value: string;
    };
    ability: {
        value: AbilityString;
    };
    hasCounteractCheck: {
        value: boolean;
    };
    location: {
        value: string;
        signature?: boolean;
        heightenedLevel?: number;

        /** The level to heighten this spell to if it's a cantrip or focus spell */
        autoHeightenLevel?: OneToTen | null;

        /** Number of uses if this is an innate spell */
        uses?: ValueAndMax;
    };
}

export type SpellSystemData = SpellSystemSource;
