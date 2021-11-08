import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
    PreciousMaterialGrade,
    PreciousMaterialType,
} from "@item/physical/data";
import { OneToThree, OneToFour, ZeroToThree } from "@module/data";
import type { LocalizePF2e } from "@module/system/localize";
import { ARMOR_PROPERTY_RUNES } from "@item/runes";
import type { ArmorPF2e } from ".";

export type ArmorSource = BasePhysicalItemSource<"armor", ArmorSystemData>;

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
export type armorMaterialType = Exclude<PreciousMaterialType, "dragonhide">;
export type ResilientRuneType = "resilient" | "greaterResilient" | "majorResilient";

export type ArmorPropertyRuneType = keyof typeof ARMOR_PROPERTY_RUNES[number];
export interface ArmorRuneData {
    potency: OneToThree | null;
    resilient: ResilientRuneType | null;
    property: Record<OneToFour, ArmorPropertyRuneType | null>;
}

/** A weapon can either be unspecific or specific along with baseline material and runes */
type SpecificArmorData =
    | {
          value: false;
      }
    | {
          value: true;
          price: string;
          material: {
              type: armorMaterialType;
              grade: PreciousMaterialGrade;
          };
          runes: Omit<ArmorRuneData, "property">;
      };

export interface ArmorPropertyRuneSlot {
    value: ArmorPropertyRuneType | null;
}

interface ArmorSystemSource extends MagicItemSystemData {
    traits: ArmorTraits;
    armor: {
        value: number;
    };
    armorType: {
        value: ArmorCategory;
    };
    baseItem: BaseArmorType | null;

    group: {
        value: ArmorGroup | null;
    };
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
    specific?: SpecificArmorData;
    potencyRune: {
        value: ZeroToThree | null;
    };
    resiliencyRune: {
        value: ResilientRuneType | null;
    };
    propertyRune1: ArmorPropertyRuneSlot;
    propertyRune2: ArmorPropertyRuneSlot;
    propertyRune3: ArmorPropertyRuneSlot;
    propertyRune4: ArmorPropertyRuneSlot;
}

export interface ArmorSystemData extends ArmorSystemSource {
    traits: ArmorTraits;
    runes: {
        potency: number;
        resilient: ZeroToThree;
        property: ArmorPropertyRuneType[];
    };
}

export const ARMOR_CATEGORIES = ["unarmored", "light", "medium", "heavy"] as const;
