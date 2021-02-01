import { CharacterData, FamiliarData, NpcData } from '../actor/actorDataDefinitions';
import { ItemData } from '../item/dataDefinitions';
import { PF2RuleElementSynthetics } from './rulesDataDefinitions';

/**
 * Rule Elements allow you to modify actorData and tokenData values when present on items. They can be configured
 * in the item's Rules tab which has to be enabled using the "Advanced Rule Element UI" system setting.
 *
 * @category RuleElement
 */
export abstract class PF2RuleElement {
    ruleData: any;
    item: ItemData;

    /**
     * @param ruleData unserialized JSON data from the actual rule input
     * @param item where the rule is persisted on
     */
    constructor(ruleData: any, item: ItemData) {
        this.ruleData = ruleData;
        this.item = item;
    }

    /**
     * Run after an item holding this rule is added to an actor. If you modify or add the rule after the item
     * is already present on the actor, nothing will happen. Rules that add toggles won't work here since
     * this method is only called on item add.
     *
     * @param actorData data of the actor that holds the item
     * @param item the added item data
     * @param actorUpdates The first time a rule is run it receives an empty object. After all rules set various values
     * on the object, this object is then passed to actor.update(). This is useful if you want to set specific values on
     * the actor when an item is added. Keep in mind that the object for actor.update() is flattened, e.g.
     * {'data.attributes.hp.value': 5}.
     * @param tokens a list of token data objects for a specific actor. An actor can have multiple tokens when dragged
     * multiple times onto a canvas. Works similar to actorUpdates and used if you want to change values on the token
     * object
     */
    onCreate(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {}

    /**
     * Run after an item holding this rule is removed from an actor. This method is used for cleaning up any values
     * on the actorData or token objects, e.g. removing temp HP.
     *
     * @param actorData data of the actor that holds the item
     * @param item the removed item data
     * @param actorUpdates see onCreate
     * @param tokens see onCreate
     */
    onDelete(actorData: CharacterData | NpcData, item: ItemData, actorUpdates: any, tokens: any[]) {}

    /**
     * Run in Actor#prepareDerivedData which is similar to an init method and is the very first thing that is run after
     * an actor.update() was called. Use this hook if you want to save or modify values on the actual data objects
     * after actor changes. Those values should not be saved back to the actor unless we mess up.
     *
     * This callback is run for each rule in random order and is run very often, so watch out for performance.
     *
     * @param actorData actor data
     * @param synthetics object holding various values that are used to set values on the actorData object, e.g.
     * damage modifiers or bonuses
     */
    onBeforePrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {}

    /**
     * Run after all actor preparation callbacks have been run so you should see all final values here.
     *
     * @param actorData see onBeforePrepareData
     * @param synthetics see onBeforePrepareData
     */
    onAfterPrepareData(actorData: CharacterData | NpcData | FamiliarData, synthetics: PF2RuleElementSynthetics) {}

    /**
     * Used to look up the label when displaying a rule effect. By default uses the label field on a rule and if absent
     * falls back to the item name that holds the rule
     *
     * @param ruleData
     * @param item
     * @return human readable label of the rule
     */
    getDefaultLabel(ruleData, item): string {
        return game.i18n.localize(ruleData.label ?? item?.name);
    }

    /**
     * Callback used to parse and look up values when calculating rules. Parses strings that look like
     * {actor|x.y.z}, {item|x.y.z} or {rule|x.y.z} where x.y.z is the path on the current actor, item or rule.
     * It's useful if you want to include something like the item's ID in a modifier selector (for applying the
     * modifier only to a specific weapon, for example), or include the item's name in some text.
     *
     * Example:
     * {
     *   "key": "PF2E.RuleElement.Note",
     *   "selector": "will",
     *   "text": "<b>{item|name}</b> A success on a Will save vs fear is treated as a critical success.",
     *   "predicate": {
     *       "all": ["fear"]
     *   }
     * }
     *
     * @param source string that should be parsed
     * @param ruleData current rule data
     * @param itemData current item data
     * @param actorData current actor data
     * @return the looked up value on the specific object
     */
    resolveInjectedProperties(source: string, ruleData: any, itemData: any, actorData: any): string {
        const objects = {
            actor: actorData,
            item: itemData,
            rule: ruleData,
        };
        return (source ?? '').replace(/{(actor|item|rule)\|(.*?)}/g, (match, obj, prop) => {
            return getProperty(objects[obj] ?? itemData, prop);
        });
    }

    /**
     * Parses the value attribute on a rule.
     *
     * @param valueData can be one of 3 different formats:
     * * {value: 5}: returns 5
     * * {value: "4 + @details.level.value"}: uses foundry's built in roll syntax to evaluate it
     * * {
     *      field: "item|data.level.value",
     *      brackets: [
     *          {start: 1, end: 4, value: 5}],
     *          {start: 5, end: 9, value: 10}],
     *   }: compares the value from field to >= start and <= end of a bracket and uses that value
     * @param ruleData current rule data
     * @param item current item data
     * @param actorData current actor data
     * @param defaultValue if no value is found, use that one
     * @return the evaluated value
     */
    resolveValue(valueData: any, ruleData: any, item: any, actorData: any, defaultValue: any = 0): any {
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
