import { ItemSourcePF2e } from "@item/data";
import { ComboWeaponMeleeUsage } from "@item/weapon/data";
import { WeaponTrait } from "@item/weapon/types";
import { MigrationBase } from "../base";

/** Fix melee-usage traits on combination weapons */
export class Migration685FixMeleeUsageTraits extends MigrationBase {
    static override version = 0.685;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "weapon") {
            const systemData: { meleeUsage?: MaybeBadMeleeUsage } = itemSource.data;
            if (systemData.meleeUsage && !Array.isArray(systemData.meleeUsage.traits)) {
                systemData.meleeUsage.traits = systemData.meleeUsage.traits.value;
            }
        }
    }
}

interface MaybeBadMeleeUsage extends Omit<ComboWeaponMeleeUsage, "traits"> {
    traits: WeaponTrait[] | { value: WeaponTrait[] };
}
