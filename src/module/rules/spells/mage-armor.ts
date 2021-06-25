import { CharacterData, NPCData } from '@actor/data';
import { ModifierPF2e, MODIFIER_TYPE } from '@module/modifiers';
import { RuleElementPF2e } from '../rule-element';
import { RuleElementSyntheticsPF2e } from '../rules-data-definitions';

/**
 * @category RuleElement
 */
export class PF2MageArmorRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(
        actorData: CharacterData | NPCData,
        { statisticsModifiers }: RuleElementSyntheticsPF2e,
    ) {
        const label = this.ruleData.label ?? this.item.name;
        const level = (this.item.data as any)?.level?.value ?? this.ruleData.level ?? 1;
        if (label) {
            let ac: number;
            let save = 0;
            if (level >= 10) {
                // heightened 10th
                ac = 3;
                save = 3;
            } else if (level >= 8) {
                // heightened 8th
                ac = 2;
                save = 2;
            } else if (level >= 6) {
                // heightened 6th
                ac = 2;
                save = 1;
            } else if (level >= 4) {
                // heightened 4th
                ac = 1;
                save = 1;
            } else {
                // not heightened
                ac = 1;
            }

            statisticsModifiers.ac = (statisticsModifiers.ac || []).concat(
                new ModifierPF2e(label, ac, MODIFIER_TYPE.ITEM),
            );
            if (save > 0) {
                statisticsModifiers['saving-throw'] = (statisticsModifiers['saving-throw'] || []).concat(
                    new ModifierPF2e(label, save, MODIFIER_TYPE.ITEM),
                );
            }
            actorData.data.attributes.dexCap = (actorData.data.attributes.dexCap ?? []).concat({
                value: 5,
                source: label,
            });
        } else {
            console.warn('PF2E | Mage armor requires at least a label field or item name');
        }
    }
}
