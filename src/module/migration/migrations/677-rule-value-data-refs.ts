import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix Rule Element values reaching for too many datas */
export class Migration677RuleValueDataRefs extends MigrationBase {
    static override version = 0.677;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if ("value" in rule && typeof rule.value === "string") {
                rule.value = rule.value.replace("@data.", "@");
            }
        }
    }
}
