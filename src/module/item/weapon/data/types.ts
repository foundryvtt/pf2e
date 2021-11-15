import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
    PreciousMaterialGrade,
    PreciousMaterialType,
} from "@item/physical/data";
import { DamageType } from "@module/damage-calculation";
import type { LocalizePF2e } from "@system/localize";
import { OneToFour, ZeroToThree } from "@module/data";
import type { WeaponPF2e } from "..";
import { WEAPON_PROPERTY_RUNES } from "@item/runes";
import { ItemFlagsPF2e } from "@item/data/base";
import { MELEE_WEAPON_GROUPS, RANGED_WEAPON_GROUPS, WEAPON_CATEGORIES, WEAPON_GROUPS, WEAPON_RANGES } from "./values";
import { DamageDieSize } from "@system/damage/damage";

export interface WeaponSource extends BasePhysicalItemSource<"weapon", WeaponSystemSource> {
    flags: DeepPartial<WeaponFlags>;
}

export class WeaponData extends BasePhysicalItemData<WeaponPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/weapon.svg";
}

export interface WeaponData extends Omit<WeaponSource, "effects" | "flags"> {
    type: WeaponSource["type"];
    data: WeaponSystemData;
    flags: WeaponFlags;
    readonly _source: WeaponSource;
}

type WeaponFlags = ItemFlagsPF2e & {
    pf2e: {
        comboMeleeUsage: boolean;
    };
};

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
    die: DamageDieSize;
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
          price: string;
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
    category: WeaponCategory;
    group: WeaponGroup | null;
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
    range: WeaponRange | null;
    reload: {
        value: string;
    };
    usage: {
        value: "worn-gloves" | "held-in-one-hand" | "held-in-one-plus-hands" | "held-in-two-hands";
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

export type WeaponRange = typeof WEAPON_RANGES[number];

export interface WeaponSystemData extends WeaponSystemSource {
    traits: WeaponTraits;
    runes: {
        potency: number;
        striking: ZeroToThree;
        property: WeaponPropertyRuneType[];
    };
}

export interface ComboWeaponMeleeUsage {
    damage: { type: DamageType; die: DamageDieSize };
    group: MeleeWeaponGroup;
    traits: WeaponTrait[];
}

export type OtherWeaponTag = "crossbow" | "ghost-touch";
