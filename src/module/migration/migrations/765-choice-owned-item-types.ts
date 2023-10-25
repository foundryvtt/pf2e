import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ChoiceSetOwnedItems } from "@module/rules/rule-element/choice-set/data.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** The types choices was never enforced when it only worked for weapons */
export class Migration765ChoiceOwnedItemTypes extends MigrationBase {
    static override version = 0.765;
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (rule.key === "ChoiceSet" && "choices" in rule && isObject<ChoiceSetOwnedItems>(rule.choices)) {
                if (rule.choices.ownedItems && !rule.choices.types) {
                    rule.choices.types = ["weapon"];
                }
            }
        }
    }
}
