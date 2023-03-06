import {
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemSystemData,
    ItemSystemSource,
    ItemTraits,
} from "@item/data/base";
import { PreciousMaterialGrade } from "@item/physical/types";
import { WeaponMaterialType } from "@item/weapon/types";
import { DamageType } from "@system/damage";
import type { MeleePF2e } from ".";

type MeleeSource = BaseItemSourcePF2e<"melee", MeleeSystemSource> & {
    flags: DeepPartial<MeleeFlags>;
};

type MeleeData = Omit<MeleeSource, "system"> & BaseItemDataPF2e<MeleePF2e, "melee", MeleeSystemData, MeleeSource>;

type MeleeFlags = ItemFlagsPF2e & {
    pf2e: {
        linkedWeapon?: string;
    };
};

interface MeleeSystemSource extends ItemSystemSource {
    traits: NPCAttackTraits;
    attack: {
        value: string;
    };
    damageRolls: Record<string, NPCAttackDamage>;
    bonus: {
        value: number;
    };
    attackEffects: {
        value: string[];
    };
    weaponType: {
        value: "melee" | "ranged";
    };
}

interface MeleeSystemData extends MeleeSystemSource, Omit<ItemSystemData, "traits"> {
    material: {
        precious: {
            type: WeaponMaterialType;
            grade: PreciousMaterialGrade;
        } | null;
    };
}

interface NPCAttackDamageSource {
    damage: string;
    damageType: DamageType;
    category?: "persistent" | "precision" | "splash" | null;
}

type NPCAttackDamage = Required<NPCAttackDamageSource>;

export type NPCAttackTrait = keyof ConfigPF2e["PF2E"]["npcAttackTraits"];
export type NPCAttackTraits = ItemTraits<NPCAttackTrait>;

export { NPCAttackDamage, MeleeData, MeleeFlags, MeleeSource, MeleeSystemData, MeleeSystemSource };
