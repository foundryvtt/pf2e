import { MigrationBase } from './base';
import { ItemDataPF2e } from '@item/data-definitions';

export class Migration626SetTokenIconProperty extends MigrationBase {
    static version = 0.626;

    /** Use the tokenIcon property on effect items instead of the TokenEffectIcon rule element */
    async updateItem(itemData: ItemDataPF2e): Promise<void> {
        const rules = itemData.data.rules;

        // Catch any items that may have missed getting rule arrays
        if (!Array.isArray(rules)) itemData.data.rules = [];

        if (itemData.type !== 'effect') return;
        itemData.data.tokenIcon ??= { show: false, alternative: null };

        const iconRules = itemData.data.rules.filter((rule) => rule.key === 'PF2E.RuleElement.TokenEffectIcon');
        if (iconRules.length > 0) {
            itemData.data.tokenIcon.show = true;

            const altIcon = iconRules[0].value ?? '';
            itemData.data.tokenIcon.alternative =
                altIcon === 'string' && altIcon.trim().length > 0 ? altIcon.trim() || null : null;
            itemData.data.rules = itemData.data.rules.filter((rule) => !iconRules.includes(rule));
        }
    }
}
