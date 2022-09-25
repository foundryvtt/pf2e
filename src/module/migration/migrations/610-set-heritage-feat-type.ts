import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";

/** Convert heritage "feats" be of type "heritage" */
export class Migration610SetHeritageFeatType extends MigrationBase {
    static override version = 0.61;

    override async updateItem(itemSource: ItemSourcePF2e) {
        const itemTraits: string[] | undefined = itemSource.system.traits?.value;
        if (itemSource.type === "feat" && itemTraits?.includes("heritage")) {
            const featType: { value: string } = itemSource.system.featType;
            featType.value = "heritage";
            const index = itemTraits.indexOf("heritage");
            itemTraits.splice(index, 1);
        }
    }
}
