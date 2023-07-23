import { BaseItemSourcePF2e, ItemFlagsPF2e, ItemSystemData, ItemSystemSource, ItemTraits } from "@item/data/base.ts";
import { PreciousMaterialGrade } from "@item/physical/types.ts";
import { WeaponMaterialType } from "@item/weapon/types.ts";
import { DamageType } from "@system/damage/types.ts";

type MeleeSource = BaseItemSourcePF2e<"melee", MeleeSystemSource> & {
    flags: DeepPartial<MeleeFlags>;
};

type MeleeFlags = ItemFlagsPF2e & {
    pf2e: {
        linkedWeapon?: string;
    };
};

interface MeleeSystemSource extends ItemSystemSource {
    level?: never;
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

interface MeleeSystemData extends MeleeSystemSource, Omit<ItemSystemData, "level" | "traits"> {
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

export { NPCAttackDamage, MeleeFlags, MeleeSource, MeleeSystemData, MeleeSystemSource };
