import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";

/** Convert heritage "feats" be of type "heritage" */
export class Migration610SetHeritageFeatType extends MigrationBase {
    static override version = 0.61;

    override async updateItem(itemData: ItemSourcePF2e) {
        const itemTraits: string[] = itemData.data.traits.value;
        if (itemData.type === "feat" && itemTraits.includes("heritage")) {
            itemData.data.featType.value = "heritage";
            const index = itemTraits.indexOf("heritage");
            itemTraits.splice(index, 1);
        }
    }
}
