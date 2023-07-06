import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { DiceModifierPF2e, ModifierPF2e } from "@actor/modifiers.ts";
import { ItemPF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { CheckRoll } from "@system/check/index.ts";
import { LaxSchemaField, PredicateField, SlugField } from "@system/schema-data-fields.ts";
import { isObject, tupleHasValue } from "@util";
import type { DataModelValidationOptions } from "types/foundry/common/abstract/data.d.ts";
import { BracketedValue, RuleElementData, RuleElementSchema, RuleElementSource, RuleValue } from "./data.ts";

const { DataModel } = foundry.abstract;

/**
 * Rule Elements allow you to modify actorData and tokenData values when present on items. They can be configured
 * in the item's Rules tab which has to be enabled using the "Advanced Rule Element UI" system setting.
 *
 * @category RuleElement
 */
abstract class RuleElementPF2e<TSchema extends RuleElementSchema = RuleElementSchema> extends DataModel<
    ItemPF2e<ActorPF2e>,
    TSchema
> {
    data: RuleElementData;

    sourceIndex: number | null;

    protected suppressWarnings: boolean;

    /** A list of actor types on which this rule element can operate (all unless overridden) */
    protected static validActorTypes: ActorType[] = ["character", "npc", "familiar", "hazard", "loot", "vehicle"];

    /**
     * @param source unserialized JSON data from the actual rule input
     * @param item where the rule is persisted on
     */
    constructor(source: RuleElementSource, options: RuleElementOptions) {
        source.label ??= options.parent.name;
        super(source, { parent: options.parent, strict: true, fallback: false });
        const { item } = this;

        // Always suppress warnings if the actor has no ID (and is therefore a temporary clone)
        this.suppressWarnings = options.suppressWarnings ?? !this.actor.id;
        this.sourceIndex = options.sourceIndex ?? null;

        const validActorType = tupleHasValue(this.constructor.validActorTypes, item.actor.type);
        if (!validActorType) {
            const ruleName = game.i18n.localize(`PF2E.RuleElement.${this.key}`);
            const actorType = game.i18n.localize(`TYPES.Actor.${item.actor.type}`);
            console.warn(`PF2e System | A ${ruleName} rules element may not be applied to a ${actorType}`);
            source.ignored = true;
        }

        this.label =
            typeof source.label === "string"
                ? game.i18n.localize(this.resolveInjectedProperties(source.label))
                : item.name;

        this.data = {
            ...source,
            key: this.key,
            predicate: Array.isArray(source.predicate) ? source.predicate : undefined,
            label: this.label,
            removeUponCreate: Boolean(source.removeUponCreate ?? false),
        } as RuleElementData;

        if (this.invalid) {
            this.ignored = true;
        } else if (item instanceof PhysicalItemPF2e) {
            this.requiresEquipped = !!(source.requiresEquipped ?? true);
            this.requiresInvestment =
                item.isInvested === null ? null : !!(source.requiresInvestment ?? this.requiresEquipped);

            // The DataModel schema defaulted `ignored` to `false`: only change to true if not already true
            if (this.ignored === false) {
                this.ignored =
                    (!!this.requiresEquipped && !item.isEquipped) ||
                    item.system.equipped.carryType === "dropped" ||
                    (!!this.requiresInvestment && !item.isInvested);
            }
        } else {
            this.requiresEquipped = null;
            this.requiresInvestment = null;
        }
    }

    static override defineSchema(): RuleElementSchema {
        const { fields } = foundry.data;
        return {
            key: new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            slug: new SlugField({ required: true, nullable: true }),
            label: new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            priority: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 100 }),
            ignored: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            predicate: new PredicateField(),
            requiresEquipped: new fields.BooleanField({ required: false, nullable: true, initial: undefined }),
            requiresInvestment: new fields.BooleanField({ required: false, nullable: true, initial: undefined }),
        };
    }

    /** Use a "lax" schema field that preserves properties not defined in the `DataSchema` */
    static override get schema(): LaxSchemaField<RuleElementSchema> {
        if (this._schema && Object.hasOwn(this, "_schema")) return this._schema;

        const schema = new LaxSchemaField(Object.freeze(this.defineSchema()));
        schema.name = this.name;
        Object.defineProperty(this, "_schema", { value: schema, writable: false });

        return schema;
    }

    get item(): this["parent"] {
        return this.parent;
    }

    get actor(): ActorPF2e {
        return this.parent.actor;
    }

    /** Retrieves the token from the actor, or from the active tokens. */
    get token(): TokenDocumentPF2e | null {
        const actor = this.actor;
        if (actor.token) return actor.token;

        const tokens = actor.getActiveTokens();
        const controlled = tokens.find((token) => token.controlled);
        return controlled?.document ?? tokens.shift()?.document ?? null;
    }

    /** Generate a label without a leading title (such as "Effect:") */
    protected getReducedLabel(label = this.label): string {
        return label.includes(":") ? label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "") : label;
    }

    /** Include parent item's name and UUID in `DataModel` validation error messages */
    override validate(options: DataModelValidationOptions = {}): boolean {
        try {
            return super.validate(options);
        } catch (error) {
            if (error instanceof foundry.data.validation.DataModelValidationError) {
                const substring = "validation errors";
                const message = error.message.replace(
                    substring,
                    `${substring} on item ${this.item.name} (${this.item.uuid})`
                );
                console.warn(message);
                return false;
            } else {
                throw error;
            }
        }
    }

    /** Test this rule element's predicate, if present */
    protected test(rollOptions?: string[] | Set<string>): boolean {
        if (this.ignored) return false;
        if (this.predicate.length === 0) return true;

        const optionSet = new Set([
            ...(rollOptions ?? this.actor.getRollOptions()),
            // Always include the item roll options of this rule element's parent item
            ...this.item.getRollOptions("parent"),
        ]);

        return this.resolveInjectedProperties(this.predicate).test(optionSet);
    }

    /** Send a deferred warning to the console indicating that a rule element's validation failed */
    protected failValidation(...message: string[]): void {
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
     * @param source The string that is to be resolved
     * @param options.warn Whether to warn on a failed resolution
     * @return the looked up value on the specific object
     */
    resolveInjectedProperties<T extends string | number | object | null | undefined>(
        source: T,
        options?: { warn?: boolean }
    ): T;
    resolveInjectedProperties(
        source: string | number | object | null | undefined,
        { warn = true } = {}
    ): string | number | object | null | undefined {
        if (source === null || typeof source === "number" || (typeof source === "string" && !source.includes("{"))) {
            return source;
        }

        // Walk the object tree and resolve any string values found
        if (Array.isArray(source)) {
            for (let i = 0; i < source.length; i++) {
                source[i] = this.resolveInjectedProperties(source[i], { warn });
            }
        } else if (isObject<Record<string, unknown>>(source)) {
            for (const [key, value] of Object.entries(source)) {
                if (typeof value === "string" || isObject(value)) {
                    source[key] = this.resolveInjectedProperties(value, { warn });
                }
            }

            return source;
        } else if (typeof source === "string") {
            return source.replace(/{(actor|item|rule)\|(.*?)}/g, (_match, key: string, prop: string) => {
                const data = key === "rule" ? this.data : key === "actor" || key === "item" ? this[key] : this.item;
                const value = getProperty(data, prop);
                if (value === undefined) {
                    this.ignored = true;
                    if (warn) this.failValidation(`Failed to resolve injected property "${source}"`);
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
        { evaluate = true, resolvables = {}, warn = true }: ResolveValueParams = {}
    ): number | string | boolean | object | null {
        let value: RuleValue = valueData ?? defaultValue ?? null;

        if (["number", "boolean"].includes(typeof value) || value === null) {
            return value;
        }
        if (typeof value === "string") value = this.resolveInjectedProperties(value, { warn });

        // Include worn armor as resolvable for PCs since there is guaranteed to be no more than one
        if (this.actor.isOfType("character")) {
            resolvables.armor = this.actor.wornArmor;
        }

        if (this.isBracketedValue(valueData)) {
            const bracketNumber = ((): number => {
                if (!valueData?.field) return this.actor.level;
                const field = String(valueData.field);
                const separator = field.indexOf("|");
                const source = field.substring(0, separator);
                const { actor, item } = this;

                switch (source) {
                    case "actor":
                        return Number(getProperty(actor, field.substring(separator + 1))) || 0;
                    case "item":
                        return Number(getProperty(item, field.substring(separator + 1))) || 0;
                    case "rule":
                        return Number(getProperty(this, field.substring(separator + 1))) || 0;
                    default:
                        return Number(getProperty(actor, field.substring(0))) || 0;
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
                const unresolveds = formula.match(/@[a-z]+/gi) ?? [];
                // Allow failure of "@target" with no warning
                if (unresolveds.length > 0) {
                    if (!unresolveds.every((u) => u === "@target")) {
                        this.ignored = true;
                        if (warn) this.failValidation(`Failed to resolve all components of formula, "${formula}"`);
                    }
                    return 0;
                }
                return Roll.safeEval(formula);
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

interface RuleElementPF2e<TSchema extends RuleElementSchema>
    extends foundry.abstract.DataModel<ItemPF2e<ActorPF2e>, TSchema>,
        ModelPropsFromSchema<RuleElementSchema> {
    constructor: typeof RuleElementPF2e<TSchema>;

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
    preUpdateActor?(): Promise<{ create: ItemSourcePF2e[]; delete: string[] }>;

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

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace RuleElementPF2e {
    export let _schema: LaxSchemaField<RuleElementSchema> | undefined;

    export interface PreCreateParams<T extends RuleElementSource = RuleElementSource> {
        /** The source partial of the rule element's parent item to be created */
        itemSource: PreCreate<ItemSourcePF2e>;
        /** The source of the rule in `itemSource`'s `system.rules` array */
        ruleSource: T;
        /** All items pending creation in a `ItemPF2e.createDocuments` call */
        pendingItems: PreCreate<ItemSourcePF2e>[];
        /** The context object from the `ItemPF2e.createDocuments` call */
        context: DocumentModificationContext<ActorPF2e | null>;
        /** Whether this preCreate run is from a pre-update reevaluation */
        reevaluation?: boolean;
    }

    export interface PreDeleteParams {
        /** All items pending deletion in a `ItemPF2e.deleteDocuments` call */
        pendingItems: ItemPF2e<ActorPF2e>[];
        /** The context object from the `ItemPF2e.deleteDocuments` call */
        context: DocumentModificationContext<ActorPF2e | null>;
    }

    export interface AfterRollParams {
        roll: Rolled<CheckRoll> | null;
        selectors: string[];
        domains: string[];
        rollOptions: Set<string>;
    }

    export type UserInput<T extends RuleElementData> = { [K in keyof T]?: unknown } & RuleElementSource;
}

interface ResolveValueParams {
    evaluate?: boolean;
    resolvables?: Record<string, unknown>;
    warn?: boolean;
}

type RuleElementOptions = {
    parent: ItemPF2e<ActorPF2e>;
    /** If created from an item, the index in the source data */
    sourceIndex?: number;
    /** If data validation fails for any reason, do not emit console warnings */
    suppressWarnings?: boolean;
};

export { RuleElementOptions, RuleElementPF2e };
