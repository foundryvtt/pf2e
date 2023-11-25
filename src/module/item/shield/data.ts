import {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { WeaponRuneData } from "@item/weapon/data.ts";
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

    runes: ShieldRuneData;

    usage: { value: "held-in-one-held" };
}

interface IntegratedWeaponSource {
    runes: Omit<WeaponRuneData, "effects">;
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
    extends Omit<ShieldSystemSource, "hp" | "identification" | "material" | "price" | "temporary" | "usage">,
        Omit<PhysicalSystemData, "baseItem" | "traits"> {
    traits: ShieldTraits;
    usage: {
        value: string;
        type: "held";
        hands: 1;
    };
}

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
