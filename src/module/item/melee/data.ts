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

type MeleeData = Omit<MeleeSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<MeleePF2e, "melee", MeleeSystemData, MeleeSource> & {
        flags: MeleeFlags;
    };

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
    damageRolls: Record<string, MeleeDamageRoll>;
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

interface MeleeDamageRoll {
    damage: string;
    damageType: DamageType;
}

export type NPCAttackTrait = keyof ConfigPF2e["PF2E"]["npcAttackTraits"];
export type NPCAttackTraits = ItemTraits<NPCAttackTrait>;

export { MeleeDamageRoll, MeleeData, MeleeSource, MeleeSystemData, MeleeSystemSource };
