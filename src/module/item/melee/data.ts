import { ItemSystemData, ItemSystemSource, ItemTraits } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import type { MeleePF2e } from ".";

export type MeleeSource = BaseNonPhysicalItemSource<"melee", MeleeSystemSource>;

export class MeleeData extends BaseNonPhysicalItemData<MeleePF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/melee.svg";
}

export interface MeleeData extends Omit<MeleeSource, "effects" | "flags"> {
    type: MeleeSource["type"];
    data: MeleeSystemData;
    readonly _source: MeleeSource;
}

export interface MeleeDamageRoll {
    damage: string;
    damageType: string;
}

export type NPCAttackTrait = keyof ConfigPF2e["PF2E"]["npcAttackTraits"];
export type NPCAttackTraits = ItemTraits<NPCAttackTrait>;

export interface MeleeSystemSource extends ItemSystemSource {
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

export type MeleeSystemData = MeleeSystemSource & Omit<ItemSystemData, "traits">;
