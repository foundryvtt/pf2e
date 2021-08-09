import { AbilityString } from "@actor/data/base";
import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
    PreciousMaterialGrade,
    PreciousMaterialType,
} from "@item/physical/data";
import { DamageType } from "@module/damage-calculation";
import type { LocalizePF2e } from "@module/system/localize";
import { OneToFour } from "@module/data";
import type { WeaponPF2e } from ".";
import { WEAPON_PROPERTY_RUNE_TYPES } from "@item/runes";

export type WeaponSource = BasePhysicalItemSource<"weapon", WeaponSystemData>;

export class WeaponData extends BasePhysicalItemData<WeaponPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/weapon.svg";
}

export interface WeaponData extends Omit<WeaponSource, "_id" | "effects"> {
    type: WeaponSource["type"];
    data: WeaponSource["data"];
    readonly _source: WeaponSource;
}

export type WeaponTrait = keyof ConfigPF2e["PF2E"]["weaponTraits"];
type WeaponTraits = PhysicalItemTraits<WeaponTrait>;

export type WeaponCategory = typeof WEAPON_CATEGORIES[number];
export type WeaponGroup = keyof ConfigPF2e["PF2E"]["weaponGroups"];
export type BaseWeaponType = keyof typeof LocalizePF2e.translations.PF2E.Weapon.Base;

export interface WeaponDamage {
    value: string;
    dice: number;
    die: string;
    damageType: DamageType;
    modifier: number;
}

export type StrikingRuneType = "striking" | "greaterStriking" | "majorStriking";

export type WeaponPropertyRuneType = typeof WEAPON_PROPERTY_RUNE_TYPES[number];
export type WeaponMaterialType = Exclude<PreciousMaterialType, "dragonhide">;
export interface WeaponRuneData {
    potency: OneToFour | null;
    striking: StrikingRuneType | null;
    property: Record<OneToFour, WeaponPropertyRuneType | null>;
}

/** A weapon can either be unspecific or specific along with baseline material and runes */
type SpecificWeaponData =
    | {
          value: false;
      }
    | {
          value: true;
          material: {
              type: WeaponMaterialType;
              grade: PreciousMaterialGrade;
          };
          runes: Omit<WeaponRuneData, "property">;
      };

export interface WeaponPropertyRuneSlot {
    value: WeaponPropertyRuneType | null;
}

interface WeaponSystemData extends MagicItemSystemData {
    traits: WeaponTraits;
    weaponType: {
        value: WeaponCategory;
    };
    group: {
        value: WeaponGroup | null;
    };
    baseItem: BaseWeaponType | null;
    hands: {
        value: boolean;
    };
    bonus: {
        value: number;
    };
    damage: WeaponDamage;
    bonusDamage?: {
        value: string;
    };
    splashDamage?: {
        value: string;
    };
    range: {
        value: string;
    };
    reload: {
        value: string;
    };
    ability: {
        value: AbilityString;
    };
    MAP: {
        value: string;
    };
    // Whether the weapon is a "specific magic weapon"
    specific?: SpecificWeaponData;
    potencyRune: {
        value: OneToFour | null;
    };
    strikingRune: {
        value: StrikingRuneType | null;
    };
    propertyRune1: WeaponPropertyRuneSlot;
    propertyRune2: WeaponPropertyRuneSlot;
    propertyRune3: WeaponPropertyRuneSlot;
    propertyRune4: WeaponPropertyRuneSlot;
    preciousMaterial: {
        value: WeaponMaterialType | null;
    };

    // Refers to custom damage, *not* property runes
    property1: {
        value: string;
        dice: number;
        die: string;
        damageType: string;
        critDice: number;
        critDie: string;
        critDamage: string;
        critDamageType: string;
    };
    selectedAmmoId?: string;
}

export const WEAPON_CATEGORIES = ["unarmed", "simple", "martial", "advanced"] as const;
