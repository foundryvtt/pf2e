import { ConsumableSource, ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add the "alchemical" trait to all firearm ammunition */
export class Migration735FirearmAmmoAlchemical extends MigrationBase {
    static override version = 0.735;

    #needsTrait(source: ConsumableSource): boolean {
        return (
            source.system.consumableType.value === "ammo" &&
            !!source.system.stackGroup?.startsWith("rounds") &&
            source.system.slug !== "cutlery" &&
            !source.system.traits.value.includes("alchemical")
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "consumable" && this.#needsTrait(source)) {
            source.system.traits.value.unshift("alchemical");
        }
    }
}
