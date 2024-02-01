import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import * as R from "remeda";

/** Fix skills section of deities */
export class Migration918DeitySkills extends MigrationBase {
    static override version = 0.918;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // return if item is not a deity
        if (source.type !== "deity") return;

        source.system.skill = R.compact(
            typeof source.system.skill === "string" ? [source.system.skill] : source.system.skill ?? [],
        );
    }
}
