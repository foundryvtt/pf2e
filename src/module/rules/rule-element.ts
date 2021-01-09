/* global game, getProperty */
import { CharacterData, FamiliarData, NpcData } from '../actor/actorDataDefinitions';
import { ItemData } from '../item/dataDefinitions';
import { PF2RuleElementSynthetics } from './rulesDataDefinitions';

/**
 * @category RuleElement
 */
export abstract class PF2RuleElement {
    onCreate(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {}

    onDelete(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {}

    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {}

    onAfterPrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {}

    // helper methods
    getDefaultLabel(ruleData, item): string {
        return game.i18n.localize(ruleData.label ?? item?.name);
    }

    resolveInjectedProperties(source, ruleData, itemData, actorData): string {
        const objects = {
            actor: actorData,
            item: itemData,
            rule: ruleData,
        };
        return (source ?? '').replace(/{(actor|item|rule)\|(.*)}/g, (match, obj, prop) => {
            return getProperty(objects[obj] ?? itemData, prop);
        });
    }

    resolveValue(valueData, ruleData, item, actorData, defaultValue: any = 0): any {
        let value = valueData;
        if (typeof valueData === 'object') {
            let bracket = getProperty(actorData, 'data.details.level.value');
            if (valueData.field) {
                const field = String(valueData.field);
                const separator = field.indexOf('|');
                const source = field.substring(0, separator);
                switch (source) {
                    case 'actor': {
                        bracket = getProperty(actorData, field.substring(separator + 1));
                        break;
                    }
                    case 'item': {
                        bracket = getProperty(item, field.substring(separator + 1));
                        break;
                    }
                    case 'rule': {
                        bracket = getProperty(ruleData, field.substring(separator + 1));
                        break;
                    }
                    default:
                        bracket = getProperty(actorData, field.substring(0));
                }
            }
            value =
                (valueData.brackets ?? []).find((b) => (b.start ?? 0) <= bracket && (b.end ? b.end >= bracket : true))
                    ?.value ?? defaultValue;
        }

        if (typeof value === 'string') {
            const roll = new Roll(value, { ...actorData.data, item: item.data });
            roll.roll();
            value = roll.total;
        }

        if (Number.isInteger(Number(value))) {
            value = Number(value);
        }

        return value;
    }
}
