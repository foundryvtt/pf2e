import { ItemSourcePF2e } from "@item/data/index.ts";
import { ChoiceSetOwnedItems, ChoiceSetSource } from "@module/rules/rule-element/choice-set/data.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** The types choices was never enforced when it only worked for weapons */
export class Migration765ChoiceOwnedItemTypes extends MigrationBase {
    static override version = 0.765;
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (rule.key !== "ChoiceSet") continue;

            const data: ChoiceSetSource = rule;
            if (isObject<ChoiceSetOwnedItems>(data.choices)) {
                if (data.choices.ownedItems && !data.choices.types) {
                    data.choices.types = ["weapon"];
                }
            }
        }
    }
}
