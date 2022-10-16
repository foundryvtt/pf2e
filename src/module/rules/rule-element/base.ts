import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { DiceModifierPF2e, ModifierPF2e } from "@actor/modifiers";
import { ItemPF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { TokenDocumentPF2e } from "@scene";
import { CheckRoll } from "@system/check/roll";
import { PredicatePF2e } from "@system/predication";
import { isObject, sluggify, tupleHasValue } from "@util";
import { BracketedValue, RuleElementData, RuleElementSource, RuleValue } from "./data";

/**
 * Rule Elements allow you to modify actorData and tokenData values when present on items. They can be configured
 * in the item's Rules tab which has to be enabled using the "Advanced Rule Element UI" system setting.
 *
 * @category RuleElement
 */
abstract class RuleElementPF2e {
    data: RuleElementData;

    key: string;

    slug: string | null;

    protected suppressWarnings: boolean;

    /** Must the parent item be equipped for this rule element to apply (`null` for non-physical items)? */
    requiresEquipped: boolean | null = null;

    /** Must the parent item be invested for this rule element to apply (`null` unless an investable physical item)? */
    requiresInvestment: boolean | null = null;

    /** A list of actor types on which this rule element can operate (all unless overridden) */
    protected static validActorTypes: ActorType[] = ["character", "npc", "familiar", "hazard", "loot", "vehicle"];

    /** A test of whether the rules element is to be applied */
    readonly predicate: PredicatePF2e;

    /**
     * @param data unserialized JSON data from the actual rule input
     * @param item where the rule is persisted on
     */
    constructor(data: RuleElementSource, public item: Embedded<ItemPF2e>, options: RuleElementOptions = {}) {
        this.key = String(data.key);
        this.slug = typeof data.slug === "string" ? sluggify(data.slug) : null;
        this.suppressWarnings = options.suppressWarnings ?? false;

        const validActorType = tupleHasValue(this.constructor.validActorTypes, item.actor.type);
        if (!validActorType) {
            const ruleName = game.i18n.localize(`PF2E.RuleElement.${this.key}`);
            const actorType = game.i18n.localize(`ACTOR.Type${item.actor.type.titleCase()}`);
            console.warn(`PF2e System | A ${ruleName} rules element may not be applied to a ${actorType}`);
            data.ignored = true;
        }
        const label = typeof data.label === "string" ? data.label : item.name;

        this.data = {
            priority: 100,
            ...data,
            key: this.key,
            predicate: Array.isArray(data.predicate) ? data.predicate : undefined,
            label: game.i18n.localize(this.resolveInjectedProperties(label)),
            ignored: Boolean(data.ignored ?? false),
            removeUponCreate: Boolean(data.removeUponCreate ?? false),
        } as RuleElementData;

        this.predicate = new PredicatePF2e(...(this.data.predicate ?? []));

        if (!this.predicate.isValid) {
            this.failValidation(`Malformed predicate: must be an array of predication statements`);
        }

        if (item instanceof PhysicalItemPF2e) {
            this.requiresEquipped = !!(data.requiresEquipped ?? true);
            this.requiresInvestment = item.isInvested === null ? null : !!(data.requiresInvestment ?? true);
        }
    }

    get actor(): ActorPF2e {
        return this.item.actor;
    }

    /** Retrieves the token from the actor, or from the active tokens. */
    get token(): TokenDocumentPF2e | null {
        const actor = this.actor;
        if (actor.token) return actor.token;

        const tokens = actor.getActiveTokens();
        const controlled = tokens.find((token) => token.controlled);
        return controlled?.document ?? tokens.shift()?.document ?? null;
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
        if (!(item instanceof PhysicalItemPF2e)) return (this.data.ignored = false);

        return (this.data.ignored =
            (!!this.requiresEquipped && !item.isEquipped) || (!!this.requiresInvestment && !item.isInvested));
    }

    set ignored(value: boolean) {
        this.data.ignored = value;
    }

    /** Test this rule element's predicate, if present */
    test(rollOptions?: string[] | Set<string>): boolean {
        if (this.ignored) return false;
        if (this.predicate.length === 0) return true;

        const optionSet =
            rollOptions instanceof Set ? rollOptions : new Set(rollOptions ?? this.actor.getRollOptions());

        return this.resolveInjectedProperties(this.predicate).test(optionSet);
    }

    /** Send a deferred warning to the console indicating that a rule element's validation failed */
    failValidation(...message: string[]): void {
        const fullMessage = message.join(" ");
        const { name, uuid } = this.item;
        if (!this.suppressWarnings) {
            const ruleName = game.i18n.localize(`PF2E.RuleElement.${this.key}`);
            this.actor.synthetics.preparationWarnings.add(
                `PF2e System | ${ruleName} rules element on item ${name} (${uuid}) failed to validate: ${fullMessage}`
            );
        }
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
     * @return the looked up value on the specific object
     */
    resolveInjectedProperties<T extends string | number | object | null | undefined>(source: T): T;
    resolveInjectedProperties(
        source: string | number | object | null | undefined
    ): string | number | object | null | undefined {
        if (source === null || typeof source === "number" || (typeof source === "string" && !source.includes("{"))) {
            return source;
        }

        // Walk the object tree and resolve any string values found
        if (Array.isArray(source)) {
            for (let i = 0; i < source.length; i++) {
                source[i] = this.resolveInjectedProperties(source[i]);
            }
        } else if (isObject<Record<string, unknown>>(source)) {
            for (const [key, value] of Object.entries(source)) {
                if (typeof value === "string" || isObject(value)) {
                    source[key] = this.resolveInjectedProperties(value);
                }
            }

            return source;
        } else if (typeof source === "string") {
            return source.replace(/{(actor|item|rule)\|(.*?)}/g, (_match, key: string, prop: string) => {
                const data = key === "rule" ? this.data : key === "actor" || key === "item" ? this[key] : this.item;
                const value = getProperty(data, prop);
                if (value === undefined) {
                    this.failValidation("Failed to resolve injected property");
                }
                return String(value);
            });
        }

        return source;
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
     * @param defaultValue if no value is found, use that one
     * @return the evaluated value
     */
    protected resolveValue(
        valueData = this.data.value,
        defaultValue: Exclude<RuleValue, BracketedValue> = 0,
        { evaluate = true, resolvables = {} } = {}
    ): number | string | boolean | object | null {
        let value: RuleValue = valueData ?? defaultValue ?? null;
        if (typeof value === "string") value = this.resolveInjectedProperties(value);

        if (this.isBracketedValue(valueData)) {
            const bracketNumber = ((): number => {
                if (!valueData?.field) return this.actor.level;
                const field = String(valueData.field);
                const separator = field.indexOf("|");
                const source = field.substring(0, separator);
                const { actor, item } = this;

                switch (source) {
                    case "actor": {
                        return (
                            Number(getProperty({ ...actor, data: actor.system }, field.substring(separator + 1))) || 0
                        );
                    }
                    case "item": {
                        return Number(getProperty({ ...item, data: item.system }, field.substring(separator + 1))) || 0;
                    }
                    case "rule": {
                        return Number(getProperty(this.data, field.substring(separator + 1))) || 0;
                    }
                    default:
                        return Number(getProperty({ ...actor, data: actor.system }, field.substring(0))) || 0;
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
                // If any resolvables were not provided for this formula, return the default value
                const unresolved = /@[a-z]+/i.exec(formula) ?? [];
                for (const resolvable of unresolved) {
                    if (resolvable === "@target") continue; // Allow to fail with no warning
                    this.failValidation(`This rule element requires a "${resolvable}" object, but none was provided.`);
                }

                return unresolved.length === 0 ? Roll.safeEval(formula) : 0;
            } catch {
                this.failValidation(`Error thrown while attempting to evaluate formula, "${formula}"`);
                return 0;
            }
        };

        return value instanceof Object && defaultValue instanceof Object
            ? mergeObject(defaultValue, value, { inplace: false })
            : typeof value === "string" && value.includes("@") && evaluate
            ? saferEval(Roll.replaceFormulaData(value, { actor: this.actor, item: this.item, ...resolvables }))
            : value;
    }

    protected isBracketedValue(value: unknown): value is BracketedValue {
        return (
            isObject<BracketedValue>(value) &&
            Array.isArray(value.brackets) &&
            (typeof value.field === "string" || !("fields" in value))
        );
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace RuleElementPF2e {
    export interface PreCreateParams<T extends RuleElementSource = RuleElementSource> {
        /** The source partial of the rule element's parent item to be created */
        itemSource: PreCreate<ItemSourcePF2e>;
        /** The source of the rule in `itemSource`'s `system.rules` array */
        ruleSource: T;
        /** All items pending creation in a `ItemPF2e.createDocuments` call */
        pendingItems: PreCreate<ItemSourcePF2e>[];
        /** The context object from the `ItemPF2e.createDocuments` call */
        context: DocumentModificationContext<ItemPF2e>;
        /** Whether this preCreate run is from a pre-update reevaluation */
        reevaluation?: boolean;
    }

    export interface PreDeleteParams {
        /** All items pending deletion in a `ItemPF2e.deleteDocuments` call */
        pendingItems: Embedded<ItemPF2e>[];
        /** The context object from the `ItemPF2e.deleteDocuments` call */
        context: DocumentModificationContext<ItemPF2e>;
    }

    export interface AfterRollParams {
        roll: Rolled<CheckRoll> | null;
        selectors: string[];
        domains: string[];
        rollOptions: Set<string>;
    }

    export type UserInput<T extends RuleElementData> = { [K in keyof T]?: unknown } & RuleElementSource;
}

interface RuleElementOptions {
    /** If data validation fails for any reason, do not emit console warnings */
    suppressWarnings?: boolean;
}

interface RuleElementPF2e {
    constructor: typeof RuleElementPF2e;

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
     */
    beforePrepareData?(): void;

    /** Run after all actor preparation callbacks have been run so you should see all final values here. */
    afterPrepareData?(): void;

    /**
     * Run just prior to a check roll, passing along roll options already accumulated
     * @param domains Applicable predication domains for pending check
     * @param rollOptions Currently accumulated roll options for the pending check
     */
    beforeRoll?(domains: string[], rollOptions: Set<string>): void;

    /**
     * Run following a check roll, passing along roll options already accumulated
     * @param domains Applicable selectors for the pending check
     * @param domains Applicable predication domains for pending check
     * @param rollOptions Currently accumulated roll options for the pending check
     */
    afterRoll?(params: RuleElementPF2e.AfterRollParams): Promise<void>;

    /** Runs before the rule's parent item's owning actor is updated */
    preUpdateActor?(): Promise<void>;

    /**
     * Runs before this rules element's parent item is created. The item is temporarilly constructed. A rule element can
     * alter itself before its parent item is stored on an actor; it can also alter the item source itself in the same
     * manner.
     */
    preCreate?({ ruleSource, itemSource, pendingItems, context }: RuleElementPF2e.PreCreateParams): Promise<void>;

    /**
     * Runs before this rules element's parent item is created. The item is temporarilly constructed. A rule element can
     * alter itself before its parent item is stored on an actor; it can also alter the item source itself in the same
     * manner.
     */
    preDelete?({ pendingItems, context }: RuleElementPF2e.PreDeleteParams): Promise<void>;

    /**
     * Runs before this rules element's parent item is updated */
    preUpdate?(changes: DeepPartial<ItemSourcePF2e>): Promise<void>;

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
    onTurnStart?(actorUpdates: Record<string, unknown>): void | Promise<void>;

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
    applyDamageExclusion?(weapon: WeaponPF2e, modifiers: (DiceModifierPF2e | ModifierPF2e)[]): void;
}

export { RuleElementPF2e, RuleElementOptions };
