import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add missing third boost from a pair of backgrounds */
export class Migration762UpdateBackgroundItems extends MigrationBase {
    static override version = 0.762;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            source.type === "background" &&
            (source.data.slug === "amnesiac" || source.data.slug === "discarded-duplicate")
        ) {
            if (Object.values(source.data.boosts).length !== 3) {
                source.data.boosts["2"] = {
                    value: ["cha", "con", "dex", "int", "str", "wis"],
                    selected: null,
                };
            }
        }
    }
}
