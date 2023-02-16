import { AncestryPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@util";
import { UUIDUtils } from "@util/uuid-utils";
import { MigrationBase } from "../base";

/** Set a slug in heritages' ancestry data */
export class Migration823HeritageAncestrySlug extends MigrationBase {
    static override version = 0.823;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "heritage" || !source.system.ancestry || source.system.ancestry.slug) {
            return;
        }

        const ancestry = await UUIDUtils.fromUuid(source.system.ancestry.uuid);
        source.system.ancestry.slug =
            ancestry instanceof AncestryPF2e
                ? ancestry.slug ?? sluggify(ancestry.name)
                : sluggify(source.system.ancestry.name);
    }
}
