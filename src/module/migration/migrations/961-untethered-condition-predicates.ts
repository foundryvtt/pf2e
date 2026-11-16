import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Untethered is now a condition rather than an effect */
export class Migration961UntetheredConditionPredicates extends MigrationBase {
    static override version = 0.961;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = recursiveReplaceString(source.system.rules, (s) =>
            s === "self:effect:untethered" ? "self:condition:untethered" : s,
        );
    }
}
