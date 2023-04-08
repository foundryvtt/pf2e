import { ItemSourcePF2e } from "@item/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration658MonkUnarmoredProficiency extends MigrationBase {
    static override version = 0.658;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const slug = itemSource.system.slug ?? sluggify(itemSource.name);
        if (itemSource.type === "class" && slug === "monk" && itemSource.system.defenses.unarmored !== 2) {
            itemSource.system.defenses.unarmored = 2;
        }
    }
}
