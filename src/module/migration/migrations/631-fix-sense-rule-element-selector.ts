import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";

/** Correct any sense rule element selector values that are using the old lowercase selector values */
export class Migration631FixSenseRuleElementSelector extends MigrationBase {
    static override version = 0.631;

    private readonly SENSE_SELECTOR_CONVERSION: Record<string, string> = {
        lowlightvision: "lowLightVision",
        Tremorsense: "tremorsense",
    } as const;

    override async updateItem(itemData: ItemSourcePF2e) {
        itemData.data.rules.forEach((rule) => {
            if (rule.key === "PF2E.RuleElement.Sense" && rule.selector) {
                rule.selector = this.SENSE_SELECTOR_CONVERSION[rule.selector] ?? rule.selector;
            }
        });
    }
}
