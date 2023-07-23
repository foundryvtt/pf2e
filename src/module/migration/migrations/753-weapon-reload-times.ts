import { ItemSourcePF2e, WeaponSource } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Ensure "backpack" weapons and alchemical bombs have correct reload times */
export class Migration753WeaponReloadTimes extends MigrationBase {
    static override version = 0.753;

    #hasThrownTrait(source: WeaponSource): boolean {
        return source.system.traits.value.some((t) => t.startsWith("thrown"));
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon") return;

        const slug = source.system.slug ?? "";

        if (["backpack-catapult", "backpack-catapult"].includes(slug)) {
            source.system.reload.value = "10";
        } else if (source.system.baseItem === "alchemical-bomb" || this.#hasThrownTrait(source)) {
            source.system.reload.value = "-";
        }
    }
}
