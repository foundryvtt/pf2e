import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@module/utils";
import { MigrationBase } from "../base";

export class Migration658MonkUnarmoredProficiency extends MigrationBase {
    static override version = 0.658;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const slug = itemSource.data.slug ?? sluggify(itemSource.name);
        if (itemSource.type === "class" && slug === "monk" && itemSource.data.defenses.unarmored !== 2) {
            itemSource.data.defenses.unarmored = 2;
        }
    }
}
