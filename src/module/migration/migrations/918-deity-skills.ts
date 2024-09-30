import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";
import { SKILL_DICTIONARY } from "./927-class-background-skill-longform.ts";

/** Fix skills section of deities */
export class Migration918DeitySkills extends MigrationBase {
    static override version = 0.918;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // return if item is not a deity
        if (source.type !== "deity") return;

        source.system.skill = (
            typeof source.system.skill === "string"
                ? [SKILL_DICTIONARY[source.system.skill]]
                : (source.system.skill ?? [])
        ).filter(R.isTruthy);
    }
}
