import type { ActorDataPF2e, CreatureData } from '@actor/data';
import type { ItemDataPF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { RuleElementSyntheticsPF2e } from './rules-data-definitions';

export interface Bracket {
    start?: number;
    end?: number;
    value: number;
}

export interface BracketedValue {
    field?: string;
    brackets: Bracket[];
}

export type RuleValue = string | number | BracketedValue;

export class TokenEffect implements TemporaryEffect {
    public data: { disabled: boolean; icon: string; tint: string } = {
        disabled: false,
        icon: '',
        tint: '',
    };

    public readonly isTemporary = true;

    public readonly flags: { [scope: string]: any } = {};

    constructor(icon: string, overlay = false, tint?: string | null | undefined) {
        this.data.icon = icon;
        if (tint) {
            this.data.tint = tint;
        }
        this.flags.core = { overlay };
    }

    getFlag(scope: string, flag: string): string | undefined {
        return this.flags[scope]?.[flag];
    }
}

/**
 * Rule Elements allow you to modify actorData and tokenData values when present on items. They can be configured
 * in the item's Rules tab which has to be enabled using the "Advanced Rule Element UI" system setting.
 *
 * @category RuleElement
 */
export abstract class RuleElementPF2e {
    ruleData: any;
    item: ItemDataPF2e;

    /**
     * @param ruleData unserialized JSON data from the actual rule input
     * @param item where the rule is persisted on
     */
    constructor(ruleData: any, item: ItemDataPF2e) {
        this.ruleData = ruleData;
        this.item = item;
    }

    /**
     * Globally ignore this rule element.
     */
    get ignored(): boolean {
        const { item } = this;
        if (game.settings.get('pf2e', 'effectAutoExpire') && item.type === 'effect' && item.data.expired) {
            return true;
        }
        if (!isPhysicalData(item)) return false;
        return !item.isEquipped || item.isInvested === false;
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
    onCreate(_actorData: CreatureData, _item: ItemDataPF2e, _actorUpdates: any, _tokens: any[]) {}

    /**
     * Run after an item holding this rule is removed from an actor. This method is used for cleaning up any values
     * on the actorData or token objects, e.g. removing temp HP.
     *
     * @param actorData data of the actor that holds the item
     * @param item the removed item data
     * @param actorUpdates see onCreate
     * @param tokens see onCreate
     */
    onDelete(_actorData: CreatureData, _item: ItemDataPF2e, _actorUpdates: any, _tokens: any[]) {}

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
    onBeforePrepareData(_actorData: CreatureData, _synthetics: RuleElementSyntheticsPF2e) {}

    /**
     * Run after all actor preparation callbacks have been run so you should see all final values here.
     *
     * @param actorData see onBeforePrepareData
     * @param synthetics see onBeforePrepareData
     */
    onAfterPrepareData(_actorData: CreatureData, _synthetics: RuleElementSyntheticsPF2e) {}

    /**
     * Run before a new token is created of the actor that holds the item.
     *
     * @param actorData the actor data of the actor that holds the item
     * @param item the item data of the item containing the rule element
     * @param token the token data of the token to be created
     */
    onCreateToken(_actorData: ActorDataPF2e, _item: ItemDataPF2e, _token: PreDocumentId<foundry.data.TokenSource>) {}

    /**
     * Used to look up the label when displaying a rule effect. By default uses the label field on a rule and if absent
     * falls back to the item name that holds the rule
     *
     * @param ruleData
     * @param item
     * @return human readable label of the rule
     */
    getDefaultLabel(ruleData: any, item: ItemDataPF2e): string {
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
        return (source ?? '').replace(/{(actor|item|rule)\|(.*?)}/g, (_match, obj, prop) => {
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
    resolveValue(valueData: RuleValue, ruleData: any, item: any, actorData: any, defaultValue: any = 0): any {
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
            value = Roll.safeEval(Roll.replaceFormulaData(value, { ...actorData.data, item: item.data }));
        }

        if (Number.isInteger(Number(value))) {
            value = Number(value);
        }

        return value;
    }
}
