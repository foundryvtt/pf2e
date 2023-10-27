import { AttributeString } from "@actor/types.ts";
import { ItemFlagsPF2e } from "@item/base/data/system.ts";
import {
    BasePhysicalItemSource,
    Investable,
    ItemMaterialData,
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
        /** A logging of this weapon's attack item bonus, whatever the source (rune, bomb innate item bonus, etc.) */
        attackItemBonus: number;
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

/** A weapon can either be unspecific or specific along with baseline material and runes */
type SpecificWeaponData =
    | {
          value: false;
      }
    | {
          value: true;
          price: string;
          material: {
              precious?: { type: WeaponMaterialType; grade: PreciousMaterialGrade };
          };
          runes: {
              potency: ZeroToFour;
              striking: StrikingRuneType | null;
          };
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
        canBeAmmo?: boolean;
        value: "worngloves" | "held-in-one-hand" | "held-in-one-plus-hands" | "held-in-two-hands";
    };
    /** An optional override of the default ability modifier used in attack rolls with this weapon  */
    attribute?: AttributeString | null;
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

    material: WeaponMaterialData;

    /** Whether this is an unarmed attack that is a grasping appendage, requiring a free hand for use */
    graspingAppendage?: boolean;

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

interface WeaponMaterialData extends ItemMaterialData {
    type: WeaponMaterialType | null;
}

interface WeaponSystemData
    extends Omit<WeaponSystemSource, "hp" | "identification" | "price" | "temporary">,
        Omit<Investable<PhysicalSystemData>, "material"> {
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
    runes: WeaponRuneData;
    usage: WeaponUsageDetails;
    graspingAppendage: boolean;
    meleeUsage?: Required<ComboWeaponMeleeUsage>;
}

type WeaponUsageDetails = UsageDetails & Required<WeaponSystemSource["usage"]>;

interface WeaponTraits extends WeaponTraitsSource {
    otherTags: OtherWeaponTag[];
    toggles: WeaponTraitToggles;
}

interface WeaponRuneData {
    potency: ZeroToFour;
    striking: ZeroToThree;
    property: WeaponPropertyRuneType[];
    effects: WeaponPropertyRuneType[];
}

interface ComboWeaponMeleeUsage {
    damage: { type: DamageType; die: DamageDieSize };
    group: MeleeWeaponGroup;
    traits?: WeaponTrait[];
    traitToggles?: { modular: DamageType | null; versatile: DamageType | null };
}

export type {
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
