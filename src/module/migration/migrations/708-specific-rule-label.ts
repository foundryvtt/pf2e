import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration708SpecificRuleLabel extends MigrationBase {
    static override version = 0.708;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (rule.label) {
                rule.label = String(rule.label).replace(/\bSpecificRules\b/, "SpecificRule");
            }
        }
    }
}
