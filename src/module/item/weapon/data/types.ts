import { ItemFlagsPF2e } from "@item/data/base";
import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { BaseMaterial, PreciousMaterialGrade } from "@item/physical/types";
import { UsageDetails } from "@item/physical/usage";
import { WEAPON_PROPERTY_RUNES } from "@item/runes";
import { OneToFour, ZeroToThree } from "@module/data";
import { DamageDieSize, DamageType } from "@system/damage";
import type { LocalizePF2e } from "@system/localize";
import type { WeaponPF2e } from "..";
import { WeaponMaterialType } from "../types";
import { MELEE_WEAPON_GROUPS, RANGED_WEAPON_GROUPS, WEAPON_CATEGORIES, WEAPON_GROUPS, WEAPON_RANGES } from "./values";

type WeaponSource = BasePhysicalItemSource<"weapon", WeaponSystemSource> & {
    flags: DeepPartial<WeaponFlags>;
};

type WeaponData = Omit<WeaponSource, "effects" | "flags"> &
    BasePhysicalItemData<WeaponPF2e, "weapon", WeaponSystemData, WeaponSource> & {
        flags: WeaponFlags;
    };

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

export type WeaponCategory = SetElement<typeof WEAPON_CATEGORIES>;
export type WeaponGroup = SetElement<typeof WEAPON_GROUPS>;
export type MeleeWeaponGroup = SetElement<typeof MELEE_WEAPON_GROUPS>;
export type RangedWeaponGroup = SetElement<typeof RANGED_WEAPON_GROUPS>;
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

interface WeaponPropertyRuneSlot {
    value: WeaponPropertyRuneType | null;
}

interface WeaponSystemSource extends Investable<PhysicalSystemSource> {
    traits: WeaponSourceTraits;
    category: WeaponCategory;
    group: WeaponGroup | null;
    baseItem: BaseWeaponType | null;
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
    range: WeaponRangeIncrement | null;
    reload: {
        value: string | null;
    };
    usage: {
        value: "worngloves" | "held-in-one-hand" | "held-in-one-plus-hands" | "held-in-two-hands";
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
    selectedAmmoId: string | null;
}

interface WeaponSystemData extends Omit<WeaponSystemSource, "temporary" | "usage">, Investable<PhysicalSystemData> {
    baseItem: BaseWeaponType | null;
    traits: WeaponTraits;
    runes: {
        potency: number;
        striking: ZeroToThree;
        property: WeaponPropertyRuneType[];
        effects: [];
    };
    material: WeaponMaterialData;
    usage: UsageDetails & WeaponSystemSource["usage"];
}

interface WeaponMaterialData {
    /** The "base material" or category: icon/steel (metal), wood, rope, etc. */
    base: BaseMaterial[];
    /** The precious material of which this weapon is composed */
    precious: {
        type: WeaponMaterialType;
        grade: PreciousMaterialGrade;
    } | null;
}

type WeaponRangeIncrement = typeof WEAPON_RANGES[number];

interface ComboWeaponMeleeUsage {
    damage: { type: DamageType; die: DamageDieSize };
    group: MeleeWeaponGroup;
    traits: WeaponTrait[];
}

type OtherWeaponTag = "crossbow" | "improvised";

export {
    ComboWeaponMeleeUsage,
    OtherWeaponTag,
    WeaponData,
    WeaponMaterialData,
    WeaponPropertyRuneSlot,
    WeaponRangeIncrement,
    WeaponSource,
    WeaponSystemData,
    WeaponSystemSource,
};
