import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import type { MeleePF2e } from ".";

export type MeleeSource = BaseNonPhysicalItemSource<"melee", MeleeSystemData>;

export class MeleeData extends BaseNonPhysicalItemData<MeleePF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/melee.svg";
}

export interface MeleeData extends Omit<MeleeSource, "_id" | "effects"> {
    type: MeleeSource["type"];
    data: MeleeSource["data"];
    readonly _source: MeleeSource;
}

export interface MeleeDamageRoll {
    damage: string;
    damageType: string;
}

export interface MeleeSystemData extends ItemSystemData {
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
