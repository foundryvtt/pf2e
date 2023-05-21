import { ItemSourcePF2e } from "@item/data/index.ts";
import { ComboWeaponMeleeUsage } from "@item/weapon/data.ts";
import { WeaponTrait } from "@item/weapon/types.ts";
import { MigrationBase } from "../base.ts";

/** Fix melee-usage traits on combination weapons */
export class Migration685FixMeleeUsageTraits extends MigrationBase {
    static override version = 0.685;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "weapon") {
            const systemData: { meleeUsage?: MaybeBadMeleeUsage } = itemSource.system;
            if (systemData.meleeUsage && !Array.isArray(systemData.meleeUsage.traits)) {
                systemData.meleeUsage.traits = systemData.meleeUsage.traits?.value ?? [];
            }
        }
    }
}

interface MaybeBadMeleeUsage extends Omit<ComboWeaponMeleeUsage, "traits"> {
    traits?: WeaponTrait[] | { value: WeaponTrait[] };
}
