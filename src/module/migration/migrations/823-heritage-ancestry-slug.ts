import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";
import { getCompendiumSource } from "../helpers.ts";

/** Set a slug in heritages' ancestry data */
export class Migration823HeritageAncestrySlug extends MigrationBase {
    static override version = 0.823;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "heritage" || !source.system.ancestry || source.system.ancestry.slug) {
            return;
        }

        const ancestry = getCompendiumSource<ItemSourcePF2e>(source.system.ancestry.uuid);
        source.system.ancestry.slug =
            ancestry && itemIsOfType(ancestry, "ancestry")
                ? (ancestry.system.slug ?? sluggify(ancestry.name))
                : sluggify(source.system.ancestry.name);
    }
}
