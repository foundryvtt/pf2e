import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Fix Rule Element values reaching for too many datas */
export class Migration677RuleValueDataRefs extends MigrationBase {
    static override version = 0.677;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        for (const rule of itemSource.system.rules) {
            if (typeof rule.value === "string") {
                rule.value = rule.value.replace("@data.", "@");
            }
        }
    }
}
