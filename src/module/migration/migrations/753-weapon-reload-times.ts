import { ItemSourcePF2e, WeaponSource } from "@item/data";
import { MigrationBase } from "../base";

/** Ensure "backpack" weapons and alchemical bombs have correct reload times */
export class Migration753WeaponReloadTimes extends MigrationBase {
    static override version = 0.753;

    #hasThrownTrait(source: WeaponSource): boolean {
        return source.data.traits.value.some((t) => t.startsWith("thrown"));
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon") return;

        const slug = source.data.slug ?? "";

        if (["backpack-catapult", "backpack-catapult"].includes(slug)) {
            source.data.reload.value = "10";
        } else if (source.data.baseItem === "alchemical-bomb" || this.#hasThrownTrait(source)) {
            source.data.reload.value = "-";
        }
    }
}
