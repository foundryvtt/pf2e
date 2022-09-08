import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

export class Migration708SpecificRuleLabel extends MigrationBase {
    static override version = 0.708;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        for (const rule of itemSource.system.rules) {
            if (rule.label) {
                rule.label = String(rule.label).replace(/\bSpecificRules\b/, "SpecificRule");
            }
        }
    }
}
