import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Clean up Calling items, setting a category and removing tags */
export class Migration934MythicCallingCategory extends MigrationBase {
    static override version = 0.934;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.system.traits.value.includes("calling")) {
            source.system.category = "calling";
            const tagIndex = source.system.traits.otherTags?.indexOf("mythic-calling");
            if (tagIndex >= 0) source.system.traits.otherTags.splice(tagIndex, 1);
        }
    }
}
