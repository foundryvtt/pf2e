import { ActorPF2e } from "@actor";
import type { ActorType } from "@actor/data";
import { EffectPF2e, ItemPF2e, PhysicalItemPF2e } from "@item";
import { BaseRawModifier } from "@module/modifiers";
import { PredicatePF2e } from "@system/predication";
import {
    BracketedValue,
    RuleElementSource,
    RuleElementData,
    RuleElementSynthetics,
    RuleValue,
    REPreCreateParameters,
    REPreDeleteParameters,
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
abstract class RuleElementPF2e {
    data: RuleElementData;

    /** A list of actor types on which this rule element can operate (all unless overridden) */
    protected static validActorTypes: ActorType[] = ["character", "npc", "familiar", "hazard", "loot", "vehicle"];

    /**
     * @param data unserialized JSON data from the actual rule input
     * @param item where the rule is persisted on
     */
    constructor(data: RuleElementSource, public item: Embedded<ItemPF2e>) {
        data.key = data.key.replace(/^PF2E\.RuleElement\./, "");
        data = deepClone(data);

        const invalidActorType = !(this.constructor as typeof RuleElementPF2e).validActorTypes.includes(
            item.actor.data.type
        );
        if (invalidActorType) {
            const ruleName = game.i18n.localize(`PF2E.RuleElement.${data.key}`);
            const actorType = game.i18n.localize(`ACTOR.Type${item.actor.type.titleCase()}`);
            ui.notifications?.warn(`PF2e System | A ${ruleName} rules element may not be applied to a ${actorType}`);
            data.ignored = true;
        }
        if (item instanceof PhysicalItemPF2e) data.requiresInvestment ??= item.isInvested !== null;

        this.data = {
            priority: 100,
            ...data,
            predicate: data.predicate ? new PredicatePF2e(data.predicate) : undefined,
            label: game.i18n.localize(data.label ?? item.name),
            ignored: data.ignored ?? false,
        };
    }

    get key(): string {
        return this.data.key;
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
        return (this.data.ignored = !item.isEquipped || (item.isInvested === false && !!this.data.requiresInvestment));
    }

    set ignored(value: boolean) {
        this.data.ignored = value;
    }

    failValidation(message: string) {
        const { name, uuid } = this.item;
        console.warn(`PF2e System | Rules element on item ${name} (${uuid}) failed to validate: ${message}`);
        this.ignored = true;
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
    resolveInjectedProperties(source = ""): string {
        if (!source.includes("{")) return source;

        const objects: Record<string, ActorPF2e | ItemPF2e | RuleElementPF2e> = {
            actor: this.actor,
            item: this.item,
            rule: this,
        };
        return source.replace(/{(actor|item|rule)\|(.*?)}/g, (_match, key: string, prop: string) => {
            const value = getProperty(objects[key]?.data ?? this.item.data, prop);
            if (value === undefined) {
                const { item } = this;
                console.warn(
                    `Failed to resolve injected property on rule element from item "${item.name}" (${item.uuid})`
                );
            }
            return value;
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
    protected resolveValue(
        valueData = this.data.value,
        defaultValue: Exclude<RuleValue, BracketedValue> = 0,
        { evaluate = true } = {}
    ): any {
        let value: RuleValue = valueData ?? defaultValue ?? null;

        if (this.isBracketedValue(valueData)) {
            const bracketNumber = ((): number => {
                if (!valueData?.field) return this.actor.level;
                const field = String(valueData.field);
                const separator = field.indexOf("|");
                const source = field.substring(0, separator);
                switch (source) {
                    case "actor": {
                        return Number(getProperty(this.actor.data, field.substring(separator + 1))) || 0;
                    }
                    case "item": {
                        return Number(getProperty(this.item.data, field.substring(separator + 1))) || 0;
                    }
                    case "rule": {
                        return Number(getProperty(this.data, field.substring(separator + 1))) || 0;
                    }
                    default:
                        return Number(getProperty(this.actor.data, field.substring(0))) || 0;
                }
            })();
            const brackets = valueData?.brackets ?? [];
            // Set the fallthrough (the value set when no bracket matches) to be of the same type as the default value
            const bracketFallthrough = (() => {
                switch (typeof defaultValue) {
                    case "number":
                    case "boolean":
                    case "object":
                        return defaultValue;
                    case "string":
                        return Number.isNaN(Number(defaultValue)) ? defaultValue : Number(defaultValue);
                    default:
                        return null;
                }
            })();
            value =
                brackets.find((bracket) => {
                    const start = bracket.start ?? 0;
                    const end = bracket.end ?? Infinity;
                    return start <= bracketNumber && end >= bracketNumber;
                })?.value ?? bracketFallthrough;
        }

        const saferEval = (formula: string): number => {
            try {
                return Roll.safeEval(formula);
            } catch {
                const { item } = this;
                console.warn(
                    `PF2e System | Unable to evaluate formula in Rule Element on item "${item.name}" (${item.uuid})`
                );
                return 0;
            }
        };

        return value instanceof Object && defaultValue instanceof Object
            ? mergeObject(defaultValue, value, { inplace: false })
            : typeof value === "string" && value.includes("@") && evaluate
            ? saferEval(Roll.replaceFormulaData(value, { actor: this.actor, item: this.item }))
            : value;
    }

    private isBracketedValue(value: RuleValue | BracketedValue | undefined): value is BracketedValue {
        return value instanceof Object && "brackets" in value && Array.isArray(value.brackets);
    }
}

interface RuleElementPF2e {
    /**
     * Run between Actor#applyActiveEffects and Actor#prepareDerivedData. Generally limited to ActiveEffect-Like
     * elements
     */
    onApplyActiveEffects?(): void;

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
    onBeforePrepareData?(synthetics: RuleElementSynthetics): void;

    /**
     * Run after all actor preparation callbacks have been run so you should see all final values here.
     *
     * @param actorData see onBeforePrepareData
     * @param synthetics see onBeforePrepareData
     */
    onAfterPrepareData?(synthetics: RuleElementSynthetics): void;

    /**
     * Runs before this rules element's parent item is created. The item is temporarilly constructed. A rule element can
     * alter itself before its parent item is stored on an actor; it can also alter the item source itself in the same
     * manner.
     * @see REPreCreateParameters
     */
    preCreate?({ ruleSource, itemSource, pendingItems, context }: REPreCreateParameters): Promise<void>;

    /**
     * Runs before this rules element's parent item is created. The item is temporarilly constructed. A rule element can
     * alter itself before its parent item is stored on an actor; it can also alter the item source itself in the same
     * manner.
     * @see REPreDeleteParameters
     */
    preDelete?({ pendingItems, context }: REPreDeleteParameters): Promise<void>;

    /**
     * Runs after an item holding this rule is added to an actor. If you modify or add the rule after the item
     * is already present on the actor, nothing will happen. Rules that add toggles won't work here since this method is
     * only called on item add.
     *
     * @param actorUpdates The first time a rule is run it receives an empty object. After all rules set various values
     * on the object, this object is then passed to actor.update(). This is useful if you want to set specific values on
     * the actor when an item is added. Keep in mind that the object for actor.update() is flattened, e.g.
     * {'data.attributes.hp.value': 5}.
     */
    onCreate?(actorUpdates: Record<string, unknown>): void;

    /**
     * Run at the start of the actor's turn. Similar to onCreate and onDelete, this provides an opportunity to make
     * updates to the actor.
     * @param actorUpdates A record containing update data for the actor
     */
    onTurnStart?(actorUpdates: Record<string, unknown>): void;

    /**
     * Runs after an item holding this rule is removed from an actor. This method is used for cleaning up any values
     * on the actorData or token objects (e.g., removing temp HP).
     *
     * @param actorData data of the actor that holds the item
     * @param item the removed item data
     * @param actorUpdates see onCreate
     * @param tokens see onCreate
     */
    onDelete?(actorUpdates: Record<string, unknown>): void;

    /** An optional method for excluding damage modifiers and extra dice */
    applyDamageExclusion?(modifiers: BaseRawModifier[]): void;
}

export { RuleElementPF2e };
