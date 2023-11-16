import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Convert string values in adjustName property to a boolean */
export class Migration892ChoiceSetREAdjustNameValue extends MigrationBase {
    static override version = 0.892;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (rule.key === "ChoiceSet" && "adjustName" in rule && typeof rule.adjustName === "string") {
                rule.adjustName = rule.adjustName === "true";
            }
        }
    }
}
