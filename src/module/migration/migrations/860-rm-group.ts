import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "../base.ts";

/** Remove `group` property that got wrongly stored in some item system data */
export class Migration860RMGroup extends MigrationBase {
    static override version = 0.86;

    override async updateItem(source: MaybeWithDeletableGroup): Promise<void> {
        if (itemIsOfType(source, "armor", "condition", "weapon") || !("group" in source.system)) {
            return;
        }

        if ("game" in globalThis) {
            source.system["-=group"] = null;
        } else {
            delete source.system.group;
        }
    }
}

type MaybeWithDeletableGroup = ItemSourcePF2e & {
    system: {
        "-=group"?: unknown;
    };
};
