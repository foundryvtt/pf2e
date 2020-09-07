/* global getProperty, Roll */
import {CharacterData, NpcData} from "../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier} from "../modifiers";
import {ItemData} from "../item/dataDefinitions";

export abstract class PF2RuleElement {

    onCreate(actorData: CharacterData|NpcData, item: ItemData, updates: any) {}

    onDelete(actorData: CharacterData|NpcData, item: ItemData, updates: any) {}

    onBeforePrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {}

    onAfterPrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {}

    // helper methods
    getDefaultLabel(ruleData, item): string {
        return game.i18n.localize(ruleData.label ?? item?.name);
    }

    resolveValue(valueData, ruleData, item, actorData): number {
        let value = valueData;
        if (typeof valueData === 'object') {
            let bracket = getProperty(actorData, 'data.details.level.value');
            if (ruleData.value.field) {
                const field = String(ruleData.value.field);
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
            value = (valueData.brackets ?? [])
                .find(b => (b.start ?? 0) <= bracket && (b.end ? b.end >= bracket : true))
                ?.value ?? 0;
        }

        if (typeof value === 'string') {
            const roll = new Roll(value, {...actorData.data, item: item.data});
            roll.roll();
            value = roll.total;
        }

        return Number(value);
    }
}
