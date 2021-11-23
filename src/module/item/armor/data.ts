import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
} from "@item/physical/data";
import { ZeroToFour, ZeroToThree } from "@module/data";
import type { LocalizePF2e } from "@module/system/localize";
import type { ArmorPF2e } from ".";

export type ArmorSource = BasePhysicalItemSource<"armor", ArmorSystemSource>;

export class ArmorData extends BasePhysicalItemData<ArmorPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/armor.svg";
}

export interface ArmorData extends Omit<ArmorSource, "effects" | "flags"> {
    type: ArmorSource["type"];
    data: ArmorSystemData;
    readonly _source: ArmorSource;
}

export type ArmorTrait = keyof ConfigPF2e["PF2E"]["armorTraits"];
type ArmorTraits = PhysicalItemTraits<ArmorTrait>;

export type ArmorCategory = keyof ConfigPF2e["PF2E"]["armorTypes"];
export type ArmorGroup = keyof ConfigPF2e["PF2E"]["armorGroups"];
export type BaseArmorType = keyof typeof LocalizePF2e.translations.PF2E.Item.Armor.Base;
export type ResilientRuneType = "" | "resilient" | "greaterResilient" | "majorResilient";

export interface ArmorSystemSource extends MagicItemSystemData {
    traits: ArmorTraits;
    armor: {
        value: number;
    };
    category: ArmorCategory;
    group: ArmorGroup | null;
    baseItem: BaseArmorType | null;

    strength: {
        value: number;
    };
    dex: {
        value: number;
    };
    check: {
        value: number;
    };
    speed: {
        value: number;
    };
    potencyRune: {
        value: ZeroToFour;
    };
    resiliencyRune: {
        value: ResilientRuneType | "";
    };
    propertyRune1: {
        value: string;
    };
    propertyRune2: {
        value: string;
    };
    propertyRune3: {
        value: string;
    };
    propertyRune4: {
        value: string;
    };
}

interface ArmorSystemData extends ArmorSystemSource {
    runes: {
        potency: number;
        resilient: ZeroToThree;
        property: string[];
    };
}

export const ARMOR_CATEGORIES = ["unarmored", "light", "medium", "heavy"] as const;
