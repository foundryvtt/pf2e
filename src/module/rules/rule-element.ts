import { ActorPF2e } from "@actor";
import type { ActorDataPF2e, CreatureData } from "@actor/data";
import { EffectPF2e, ItemPF2e, PhysicalItemPF2e } from "@item";
import type { ItemDataPF2e } from "@item/data";
import {
    BracketedValue,
    RuleElementSource,
    RuleElementData,
    RuleElementSynthetics,
    RuleValue,
} from "./rules-data-definitions";

export class TokenEffect implements TemporaryEffect {
    public data: { disabled: boolean; icon: string; tint: string } = {
        disabled: false,
        icon: "",
        tint: "",
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
    data: RuleElementData;

    /**
     * @param data unserialized JSON data from the actual rule input
     * @param item where the rule is persisted on
     */
    constructor(data: RuleElementSource, public item: Embedded<ItemPF2e>) {
        this.data = {
            priority: 100,
            ...data,
            label: game.i18n.localize(data.label ?? item.name),
            ignored: false,
        };
    }

    get key(): string {
        return this.data.key.replace(/^PF2E\.RuleElement\./, "");
    }

    get actor(): ActorPF2e {
        return this.item.actor;
    }

    get label(): string {
        return this.data.label;
    }

    /** The place in order of application (ascending), among an actor's list of rule elements */
    get priority(): number {
        return this.data.priority;
    }

    /** Globally ignore this rule element. */
    get ignored(): boolean {
        if (this.data.ignored) return true;

        const { item } = this;
        if (game.settings.get("pf2e", "automation.effectExpiration") && item instanceof EffectPF2e && item.isExpired) {
            return (this.data.ignored = true);
        }
        if (!(item instanceof PhysicalItemPF2e)) return (this.data.ignored = false);
        return (this.data.ignored = !item.isEquipped || item.isInvested === false);
    }

    set ignored(value: boolean) {
        this.data.ignored = value;
    }

    /**
     * Run after an item holding this rule is added to an actor. If you modify or add the rule after the item
     * is already present on the actor, nothing will happen. Rules that add toggles won't work here since
     * this method is only called on item add.
     *
     * @param actorUpdates The first time a rule is run it receives an empty object. After all rules set various values
     * on the object, this object is then passed to actor.update(). This is useful if you want to set specific values on
     * the actor when an item is added. Keep in mind that the object for actor.update() is flattened, e.g.
     * {'data.attributes.hp.value': 5}.
     */
    onCreate(_actorUpdates: Record<string, unknown>): void {}

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
     * Run between Actor#applyActiveEffects and Actor#prepareDerivedData. Generally limited to ActiveEffect-Like
     * elements
     */
    onApplyActiveEffects(): void {}

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
    onBeforePrepareData(_actorData?: CreatureData, _synthetics?: RuleElementSynthetics): void {}

    /**
     * Run after all actor preparation callbacks have been run so you should see all final values here.
     *
     * @param actorData see onBeforePrepareData
     * @param synthetics see onBeforePrepareData
     */
    onAfterPrepareData(_actorData: CreatureData, _synthetics: RuleElementSynthetics) {}

    /**
     * Run before a new token is created of the actor that holds the item.
     *
     * @param actorData the actor data of the actor that holds the item
     * @param item the item data of the item containing the rule element
     * @param token the token data of the token to be created
     */
    onCreateToken(_actorData: ActorDataPF2e, _item: ItemDataPF2e, _token: PreDocumentId<foundry.data.TokenSource>) {}

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
    resolveInjectedProperties(source: string | undefined): string {
        const objects: Record<string, ActorPF2e | ItemPF2e | RuleElementPF2e> = {
            actor: this.actor,
            item: this.item,
            rule: this,
        };
        return (source ?? "").replace(/{(actor|item|rule)\|(.*?)}/g, (_match, key: string, prop: string) => {
            return getProperty(objects[key]?.data ?? this.item.data, prop);
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
    resolveValue(valueData = this.data.value, defaultValue: Exclude<RuleValue, BracketedValue> = 0): any {
        let value = valueData;
        const actor = this.item.actor;
        if (typeof valueData === "object") {
            let bracket = getProperty(actor.data, "data.details.level.value");
            if (valueData?.field) {
                const field = String(valueData.field);
                const separator = field.indexOf("|");
                const source = field.substring(0, separator);
                switch (source) {
                    case "actor": {
                        bracket = getProperty(actor.data, field.substring(separator + 1));
                        break;
                    }
                    case "item": {
                        bracket = getProperty(this.item.data, field.substring(separator + 1));
                        break;
                    }
                    case "rule": {
                        bracket = getProperty(this.data, field.substring(separator + 1));
                        break;
                    }
                    default:
                        bracket = getProperty(actor.data, field.substring(0));
                }
            }
            value =
                (valueData?.brackets ?? []).find((b) => (b.start ?? 0) <= bracket && (b.end ? b.end >= bracket : true))
                    ?.value ??
                (Number(defaultValue) || 0);
        }

        if (typeof value === "string") {
            value = Roll.safeEval(Roll.replaceFormulaData(value, { ...actor.data.data, item: this.item.data.data }));
        }

        if (typeof value !== "boolean" && Number.isInteger(Number(value))) {
            value = Number(value);
        }

        return value;
    }
}
