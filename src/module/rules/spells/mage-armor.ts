import { CharacterData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2Modifier, PF2ModifierType } from '../../modifiers';
import { PF2RuleElement } from '../rule-element';
import { PF2RuleElementSynthetics } from '../rulesDataDefinitions';

/**
 * @category RuleElement
 */
export class PF2MageArmorRuleElement extends PF2RuleElement {
    onBeforePrepareData(actorData: CharacterData | NpcData, { statisticsModifiers }: PF2RuleElementSynthetics) {
        const label = this.ruleData.label ?? this.item.name;
        const level = (this.item.data as any)?.level?.value ?? this.ruleData.level ?? 1;
        if (label) {
            let ac;
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
                new PF2Modifier(label, ac, PF2ModifierType.ITEM),
            );
            if (save > 0) {
                statisticsModifiers['saving-throw'] = (statisticsModifiers['saving-throw'] || []).concat(
                    new PF2Modifier(label, save, PF2ModifierType.ITEM),
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
