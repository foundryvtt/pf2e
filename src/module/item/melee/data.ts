import {
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemSystemData,
    ItemSystemSource,
    ItemTraitsNoRarity,
} from "@item/base/data/system.ts";
import { WeaponMaterialData } from "@item/weapon/data.ts";
import { WeaponPropertyRuneType } from "@item/weapon/types.ts";
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
    material: WeaponMaterialData;
    runes: { property: WeaponPropertyRuneType[] };
}

interface NPCAttackDamageSource {
    damage: string;
    damageType: DamageType;
    category?: "persistent" | "precision" | "splash" | null;
}

type NPCAttackDamage = Required<NPCAttackDamageSource>;

export type NPCAttackTrait = keyof ConfigPF2e["PF2E"]["npcAttackTraits"];
export type NPCAttackTraits = ItemTraitsNoRarity<NPCAttackTrait>;

export type { MeleeFlags, MeleeSource, MeleeSystemData, MeleeSystemSource, NPCAttackDamage };
