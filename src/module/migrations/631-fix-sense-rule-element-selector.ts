import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data/types';

/** Correct any sense rule element selector values that are using the old lowercase selector values */
export class Migration631FixSenseRuleElementSelector extends MigrationBase {
    static version = 0.631;

    private readonly SENSE_SELECTOR_CONVERSION: Record<string, string> = {
        lowlightvision: 'lowLightVision',
        Tremorsense: 'tremorsense',
    } as const;

    async updateItem(itemData: ItemDataPF2e) {
        itemData.data.rules.forEach((rule) => {
            if (rule.key === 'PF2E.RuleElement.Sense' && rule.selector) {
                rule.selector = this.SENSE_SELECTOR_CONVERSION[rule.selector] ?? rule.selector;
            }
        });
    }
}
