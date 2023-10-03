import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add missing third boost from a pair of backgrounds */
export class Migration762UpdateBackgroundItems extends MigrationBase {
    static override version = 0.762;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            source.type === "background" &&
            (source.system.slug === "amnesiac" || source.system.slug === "discarded-duplicate")
        ) {
            if (Object.values(source.system.boosts).length !== 3) {
                source.system.boosts["2"] = {
                    value: ["cha", "con", "dex", "int", "str", "wis"],
                    selected: null,
                };
            }
        }
    }
}
