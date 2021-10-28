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
import { OneToFour, ZeroToThree } from "@module/data";
import type { WeaponPF2e } from ".";
import { WEAPON_PROPERTY_RUNES } from "@item/runes";

export type WeaponSource = BasePhysicalItemSource<"weapon", WeaponSystemSource>;

export class WeaponData extends BasePhysicalItemData<WeaponPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/weapon.svg";
}

export interface WeaponData extends Omit<WeaponSource, "effects" | "flags"> {
    type: WeaponSource["type"];
    data: WeaponSystemData;
    readonly _source: WeaponSource;
}

export type WeaponTrait = keyof ConfigPF2e["PF2E"]["weaponTraits"];
interface WeaponSourceTraits extends PhysicalItemTraits<WeaponTrait> {
    otherTags?: OtherWeaponTag[];
}
type WeaponTraits = Required<WeaponSourceTraits>;

export type WeaponCategory = typeof WEAPON_CATEGORIES[number];
export type WeaponGroup = typeof WEAPON_GROUPS[number];
export type MeleeWeaponGroup = typeof MELEE_WEAPON_GROUPS[number];
export type RangedWeaponGroup = typeof RANGED_WEAPON_GROUPS[number];
export type BaseWeaponType = keyof typeof LocalizePF2e.translations.PF2E.Weapon.Base;

export interface WeaponDamage {
    value: string;
    dice: number;
    die: string;
    damageType: DamageType;
    modifier: number;
}

export type StrikingRuneType = "striking" | "greaterStriking" | "majorStriking";

export type WeaponPropertyRuneType = keyof typeof WEAPON_PROPERTY_RUNES[number];
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

export interface WeaponSystemSource extends MagicItemSystemData {
    traits: WeaponSourceTraits;
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
    /** A combination weapon's melee usage */
    meleeUsage?: ComboWeaponMeleeUsage;
    /** Whether the weapon is a "specific magic weapon" */
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

    selectedAmmoId?: string;
}

export interface WeaponSystemData extends WeaponSystemSource {
    traits: WeaponTraits;
    runes: {
        potency: number;
        striking: ZeroToThree;
        property: WeaponPropertyRuneType[];
    };
}

interface ComboWeaponMeleeUsage {
    damage: { type: DamageType; die: string };
    group: MeleeWeaponGroup;
    traits: WeaponTrait[];
}

export type OtherWeaponTag = "crossbow" | "ghost-touch";

export const WEAPON_CATEGORIES = ["unarmed", "simple", "martial", "advanced"] as const;

export const MELEE_WEAPON_GROUPS = [
    "axe",
    "brawling",
    "club",
    "flail",
    "hammer",
    "knife",
    "pick",
    "polearm",
    "shield",
    "spear",
    "sword",
] as const;

export const RANGED_WEAPON_GROUPS = ["bomb", "bow", "dart", "firearm", "sling"] as const;

export const WEAPON_GROUPS = [...MELEE_WEAPON_GROUPS, ...RANGED_WEAPON_GROUPS] as const;

// Crossbow isn't a weapon group, so we need to assign it when one of these is a base weapon
export const CROSSBOW_WEAPONS = new Set([
    "alchemical-crossbow",
    "crossbow",
    "hand-crossbow",
    "heavy-crossbow",
    "repeating-crossbow",
    "repeating-hand-crossbow",
    "repeating-heavy-crossbow",
] as const);
