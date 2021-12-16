import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Consolidate all the Alertness class features to a single item */
export class Migration700SingleAlertnessFeature extends MigrationBase {
    static override version = 0.7;

    private alertnessItemIds = new Set([
        "OZaJz4exCoz6vuuv",
        "qJ4fwGpoNC36ZQ8I",
        "D8CSi8c9XiRpVc5M",
        "2o1Cj7hDayDlslqY",
        "TAIOtk5VvPZvv4nu",
    ]);

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "class") {
            // Update the reference ID and name of the Alertness feature entry
            for (const refId in itemSource.data.items) {
                const itemRef = itemSource.data.items[refId];
                itemRef.level = Number(itemRef.level) || 1;

                if (this.alertnessItemIds.has(itemRef.id)) {
                    itemRef.id = "D8CSi8c9XiRpVc5M";
                    itemRef.name = "Alertness";
                }
            }
        } else if (itemSource.type === "feat" && itemSource.data.slug?.startsWith("alertness-")) {
            // Update the name slug and traits of owned Alertness items
            itemSource.data.slug = "alertness";
            if (itemSource.name.startsWith("Alertness ")) itemSource.name = "Alertness";
            itemSource.data.traits.value = [];
        }
    }
}
