import { ConsumableSource, ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add the "alchemical" trait to all firearm ammunition */
export class Migration735FirearmAmmoAlchemical extends MigrationBase {
    static override version = 0.735;

    #needsTrait(source: ConsumableSource): boolean {
        return (
            source.data.consumableType.value === "ammo" &&
            !!source.data.stackGroup?.startsWith("rounds") &&
            source.data.slug !== "cutlery" &&
            !source.data.traits.value.includes("alchemical")
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "consumable" && this.#needsTrait(source)) {
            source.data.traits.value.unshift("alchemical");
        }
    }
}
