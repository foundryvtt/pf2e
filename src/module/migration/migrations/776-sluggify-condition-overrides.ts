import { ItemSourcePF2e } from "@item/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Sluggify values in condition `overrides` arrays */
export class Migration776SlugifyConditionOverrides extends MigrationBase {
    static override version = 0.776;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "condition") return;
        const { system } = source;

        if (Array.isArray(system.overrides) && system.overrides.every((o) => typeof o === "string")) {
            system.overrides = system.overrides.map((o) => sluggify(o));
        }
    }
}
