import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

/** Correct any sense rule element selector values that are using the old lowercase selector values */
export class Migration631FixSenseRuleElementSelector extends MigrationBase {
    static override version = 0.631;

    private readonly SENSE_SELECTOR_CONVERSION: Record<string, string | undefined> = {
        lowlightvision: "lowLightVision",
        Tremorsense: "tremorsense",
    } as const;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: MaybeWithSelector[] = source.system.rules;
        for (const rule of rules) {
            if (rule.key === "PF2E.RuleElement.Sense" && typeof rule.selector === "string") {
                rule.selector = this.SENSE_SELECTOR_CONVERSION[rule.selector] ?? rule.selector;
            }
        }
    }
}

interface MaybeWithSelector {
    key?: unknown;
    selector?: unknown;
}
