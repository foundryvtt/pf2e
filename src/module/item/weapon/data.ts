import { ItemFlagsPF2e } from "@item/data/base.ts";
import {
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
    PreciousMaterialGrade,
    UsageDetails,
} from "@item/physical/index.ts";
import { OneToFour, ZeroToFour, ZeroToThree } from "@module/data.ts";
import { DamageDieSize, DamageType } from "@system/damage/index.ts";
import { WeaponTraitToggles } from "./helpers.ts";
import {
    BaseWeaponType,
    MeleeWeaponGroup,
    OtherWeaponTag,
    StrikingRuneType,
    WeaponCategory,
    WeaponGroup,
    WeaponMaterialType,
    WeaponPropertyRuneType,
    WeaponRangeIncrement,
    WeaponReloadTime,
    WeaponTrait,
} from "./types.ts";
import { AbilityString } from "@actor/types.ts";

type WeaponSource = BasePhysicalItemSource<"weapon", WeaponSystemSource> & {
    flags: DeepPartial<WeaponFlags>;
};

type WeaponFlags = ItemFlagsPF2e & {
    pf2e: {
        /** Whether this attack is from a battle form */
        battleForm?: boolean;
        comboMeleeUsage: boolean;
        /**
         * Used for NPC attacks generated from strike rule elements: if numeric, it will be used as the NPC attack's
         * modifier, and damage will also not be recalculated.
         */
        fixedAttack?: number | null;
    };
};

interface WeaponTraitsSource extends PhysicalItemTraits<WeaponTrait> {
    otherTags: OtherWeaponTag[];
    toggles?: {
        modular?: { selection: DamageType | null };
        versatile?: { selection: DamageType | null };
    };
}

interface WeaponDamage {
    dice: number;
    die: DamageDieSize | null;
    damageType: DamageType;
    modifier: number;
    /** Optional persistent damage */
    persistent: WeaponPersistentDamage | null;
}

interface WeaponPersistentDamage {
    /** A number of dice if `faces` is numeric, otherwise a constant */
    number: number;
    /** A number of die faces */
    faces: 4 | 6 | 8 | 10 | 12 | null;
    /** Usually the same as the weapon's own base damage type, but open for the user to change */
    type: DamageType;
}

interface WeaponRuneData {
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
              precious?: {
                  type: WeaponMaterialType;
                  grade: PreciousMaterialGrade;
              };
          };
          runes: Omit<WeaponRuneData, "property">;
      };

interface WeaponPropertyRuneSlot {
    value: WeaponPropertyRuneType | null;
}

interface WeaponSystemSource extends Investable<PhysicalSystemSource> {
    traits: WeaponTraitsSource;
    category: WeaponCategory;
    group: WeaponGroup | null;
    baseItem: BaseWeaponType | null;
    bonus: {
        value: number;
    };
    damage: WeaponDamage;
    bonusDamage: {
        value: number;
    };
    splashDamage: {
        value: number;
    };
    range: WeaponRangeIncrement | null;
    maxRange?: number | null;
    reload: {
        value: WeaponReloadTime | null;
    };
    usage: {
        value: "worngloves" | "held-in-one-hand" | "held-in-one-plus-hands" | "held-in-two-hands";
    };
    MAP: {
        value: string;
    };
    /** An optional override of the default ability modifier used in attack rolls with this weapon  */
    ability?: AbilityString | null;
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
        die: DamageDieSize;
        damageType: DamageType | "";
        critDice: number;
        critDie: DamageDieSize;
        critDamage: string;
        critDamageType: DamageType | "";
    };
    selectedAmmoId: string | null;
}

interface WeaponSystemData
    extends Omit<WeaponSystemSource, "identification" | "price" | "temporary">,
        Investable<PhysicalSystemData> {
    traits: WeaponTraits;
    baseItem: BaseWeaponType | null;
    maxRange: number | null;
    reload: {
        value: WeaponReloadTime | null;
        /** Whether the ammunition (or the weapon itself, if thrown) should be consumed upon firing */
        consume: boolean | null;
        /** A display label for use in any view */
        label: string | null;
    };
    runes: {
        potency: ZeroToFour;
        striking: ZeroToThree;
        property: WeaponPropertyRuneType[];
        effects: [];
    };
    material: WeaponMaterialData;
    usage: UsageDetails & WeaponSystemSource["usage"];
    meleeUsage?: Required<ComboWeaponMeleeUsage>;
}

interface WeaponTraits extends WeaponTraitsSource {
    otherTags: OtherWeaponTag[];
    toggles: WeaponTraitToggles;
}

interface WeaponMaterialData {
    /** The precious material of which this weapon is composed */
    precious: {
        type: WeaponMaterialType;
        grade: PreciousMaterialGrade;
    } | null;
}

interface ComboWeaponMeleeUsage {
    damage: { type: DamageType; die: DamageDieSize };
    group: MeleeWeaponGroup;
    traits?: WeaponTrait[];
    traitToggles?: { modular: DamageType | null; versatile: DamageType | null };
}

export {
    ComboWeaponMeleeUsage,
    WeaponDamage,
    WeaponFlags,
    WeaponMaterialData,
    WeaponPersistentDamage,
    WeaponPropertyRuneSlot,
    WeaponRuneData,
    WeaponSource,
    WeaponSystemData,
    WeaponSystemSource,
};
