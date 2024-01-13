import { PhysicalItemSource } from "@item/base/data/index.ts";
import {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { HeldUsage } from "@item/physical/usage.ts";
import { WeaponRuneData, WeaponRuneSource } from "@item/weapon/data.ts";
import { ZeroToSix } from "@module/data.ts";
import { DamageType } from "@system/damage/types.ts";
import { BaseShieldType, ShieldTrait } from "./types.ts";

type ShieldSource = BasePhysicalItemSource<"shield", ShieldSystemSource>;

interface ShieldSystemSource extends PhysicalSystemSource {
    traits: ShieldTraitsSource;
    baseItem: BaseShieldType | null;
    acBonus: number;
    speedPenalty: number;
    /** Data stored at the time of marking a shield as specific */
    specific: SpecificShieldData | null;
    /** Currently supports reinforcing runes */
    runes: ShieldRuneData;
    /** Usage for shields isn't stored. */
    readonly usage?: never;
    /** Doubly-embedded adjustments, attachments, talismans etc. */
    subitems: PhysicalItemSource[];
}

interface IntegratedWeaponSource {
    runes: WeaponRuneSource;
    versatile: { selection: DamageType } | null;
}

interface ShieldTraitsSource extends PhysicalItemTraits<ShieldTrait> {
    integrated: IntegratedWeaponSource | null;
}

type ShieldRuneData = { reinforcing: ZeroToSix };

/** A weapon can either be unspecific or specific along with baseline material and runes */
interface SpecificShieldData extends Pick<ShieldSystemSource, "material" | "runes"> {
    integrated: { runes: Omit<WeaponRuneData, "effects"> } | null;
}

interface ShieldSystemData
    extends Omit<ShieldSystemSource, SourceOmission>,
        Omit<PhysicalSystemData, "baseItem" | "traits"> {
    traits: ShieldTraits;
    /** Shields are always held. */
    usage: HeldUsage;
    stackGroup: null;
}

type SourceOmission =
    | "apex"
    | "bulk"
    | "description"
    | "hp"
    | "identification"
    | "material"
    | "price"
    | "temporary"
    | "usage";

interface IntegratedWeaponData extends IntegratedWeaponSource {
    damageType: DamageType;
    versatile: { options: DamageType[]; selection: DamageType } | null;
}

interface ShieldTraits extends ShieldTraitsSource {
    integrated: IntegratedWeaponData | null;
}

export type {
    IntegratedWeaponData,
    IntegratedWeaponSource,
    ShieldSource,
    ShieldSystemData,
    ShieldSystemSource,
    SpecificShieldData,
};
