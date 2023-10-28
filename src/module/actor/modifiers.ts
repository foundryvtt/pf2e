import type { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { AttributeString } from "@actor/types.ts";
import { ZeroToFour } from "@module/data.ts";
import type { RollNotePF2e } from "@module/notes.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import type { RuleElementPF2e } from "@module/rules/index.ts";
import { DamageCategoryUnique, DamageDieSize, DamageType } from "@system/damage/types.ts";
import { PredicatePF2e, RawPredicate } from "@system/predication.ts";
import { ErrorPF2e, objectHasKey, setHasElement, signedInteger, sluggify, tupleHasValue } from "@util";

const PROFICIENCY_RANK_OPTION = [
    "proficiency:untrained",
    "proficiency:trained",
    "proficiency:expert",
    "proficiency:master",
    "proficiency:legendary",
] as const;

function ensureProficiencyOption(options: Set<string>, rank: number): void {
    if (rank >= 0) {
        options.add(`skill:rank:${rank}`).add(PROFICIENCY_RANK_OPTION[rank]);
    }
}

const MODIFIER_TYPES = new Set([
    "ability",
    "circumstance",
    "item",
    "potency",
    "proficiency",
    "status",
    "untyped",
] as const);

type ModifierType = SetElement<typeof MODIFIER_TYPES>;

interface BaseRawModifier {
    /** An identifier for this modifier; should generally be a localization key (see en.json). */
    slug?: string;
    /** The display name of this modifier; can be a localization key (see en.json). */
    label: string;
    /** The actual numeric benefit/penalty that this modifier provides. */
    modifier?: number;
    /** The type of this modifier - modifiers of the same type do not stack (except for `untyped` modifiers). */
    type?: ModifierType;
    /** If the type is "ability", this should be set to a particular ability */
    ability?: AttributeString | null;
    /** Numeric adjustments to apply */
    adjustments?: ModifierAdjustment[];
    /** If true, this modifier will be applied to the final roll; if false, it will be ignored. */
    enabled?: boolean;
    /** If true, these custom dice are being ignored in the damage calculation. */
    ignored?: boolean;
    /** The source from which this modifier originates, if any. */
    source?: string | null;
    /** If true, this modifier is a custom player-provided modifier. */
    custom?: boolean;
    /** The damage type that this modifier does, if it modifies a damage roll. */
    damageType?: DamageType | null;
    /** The damage category */
    damageCategory?: DamageCategoryUnique | null;
    /** A predicate which determines when this modifier is active. */
    predicate?: RawPredicate;
    /** If true, this modifier is only active on a critical hit. */
    critical?: boolean | null;
    /** The list of traits that this modifier gives to the underlying attack, if any. */
    traits?: string[];
    /** Hide this modifier in UIs if it is disabled */
    hideIfDisabled?: boolean;
}

interface ModifierAdjustment {
    /** A slug for matching against modifiers: `null` will match against all modifiers within a selector */
    slug: string | null;
    test: (options: string[] | Set<string>) => boolean;
    damageType?: DamageType;
    relabel?: string;
    suppress?: boolean;
    getNewValue?: (current: number) => number;
    getDamageType?: (current: DamageType | null) => DamageType | null;
}

interface RawModifier extends BaseRawModifier {
    modifier: number;
    /** Whether to use this bonus/penalty/modifier even if it isn't the greatest magnitude */
    force?: boolean;
}

interface DeferredValueParams {
    /** An object to merge into roll data for `Roll.replaceFormulaData` */
    resolvables?: Record<string, unknown>;
    /** An object to merge into standard options for `RuleElementPF2e#resolveInjectedProperties` */
    injectables?: Record<string, unknown>;
    /** Roll Options to get against a predicate (if available) */
    test?: string[] | Set<string>;
}

interface TestableDeferredValueParams extends DeferredValueParams {
    test: Set<string>;
}

type DeferredValue<T> = (options?: DeferredValueParams) => T | null;
type DeferredPromise<T> = (options?: DeferredValueParams) => Promise<T | null>;

/** Represents a discrete modifier, bonus, or penalty, to a statistic or check. */
class ModifierPF2e implements RawModifier {
    slug: string;
    label: string;

    /** The value of the modifier */
    modifier: number;
    /** The value before adjustments are applied */
    #originalValue: number;

    type: ModifierType;
    ability: AttributeString | null;
    adjustments: ModifierAdjustment[];
    force: boolean;
    enabled: boolean;
    ignored: boolean;
    /** The originating rule element of this modifier, if any: used to retrieve "parent" item roll options */
    rule: RuleElementPF2e | null;
    source: string | null;
    custom: boolean;
    damageType: DamageType | null;
    damageCategory: DamageCategoryUnique | null;
    predicate: PredicatePF2e;
    critical: boolean | null;
    traits: string[];
    hideIfDisabled: boolean;

    /**
     * The "category" of modifier (a misnomer since bonuses and penalties aren't modifiers):
     * Recorded before adjustments in case of adjustment to zero
     */
    kind: "bonus" | "penalty" | "modifier";

    /**
     * Create a new modifier.
     * Legacy parameters:
     * @param name The name for the modifier; should generally be a localization key.
     * @param modifier The actual numeric benefit/penalty that this modifier provides.
     * @param type The type of the modifier - modifiers of the same type do not stack (except for `untyped` modifiers).
     * @param enabled If true, this modifier will be applied to the result; otherwise, it will not.
     * @param source The source from which this modifier originates, if any.
     * @param notes Any notes about this modifier.
     */
    constructor(args: ModifierObjectParams);
    constructor(...args: ModifierOrderedParams);
    constructor(...args: [ModifierObjectParams] | ModifierOrderedParams) {
        const isLegacyParams = (args: [ModifierObjectParams] | ModifierOrderedParams): args is ModifierOrderedParams =>
            typeof args[0] === "string";
        const params: ModifierObjectParams = isLegacyParams(args)
            ? {
                  label: args[0],
                  modifier: args[1],
                  type: args[2] ?? "untyped",
                  enabled: args[3],
                  ignored: args[4],
                  source: args[5],
              }
            : args[0];

        this.label = game.i18n.localize(params.label ?? params.name);
        this.slug = sluggify(params.slug ?? this.label);

        this.#originalValue = this.modifier = params.modifier;

        this.type = setHasElement(MODIFIER_TYPES, params.type) ? params.type : "untyped";
        this.ability = params.ability ?? null;
        this.force = params.force ?? false;
        this.adjustments = deepClone(params.adjustments ?? []);
        this.enabled = params.enabled ?? true;
        this.ignored = params.ignored ?? false;
        this.custom = params.custom ?? false;
        this.source = params.source ?? null;
        this.predicate = new PredicatePF2e(params.predicate ?? []);
        this.traits = deepClone(params.traits ?? []);
        this.hideIfDisabled = params.hideIfDisabled ?? false;
        this.modifier = params.modifier;

        this.rule = params.rule ?? null;
        // Prevent upstream from blindly diving into recursion loops
        Object.defineProperty(this, "rule", { enumerable: false });

        this.damageType = objectHasKey(CONFIG.PF2E.damageTypes, params.damageType) ? params.damageType : null;
        this.damageCategory = this.damageType === "bleed" ? "persistent" : params.damageCategory ?? null;
        // Force splash damage into being critical-only or not doubling on critical hits
        this.critical = this.damageCategory === "splash" ? !!params.critical : params.critical ?? null;

        this.kind = ((): "bonus" | "penalty" | "modifier" => {
            if (this.modifier >= 0 && !["ability", "untyped"].includes(this.type)) {
                return "bonus";
            }
            if (this.modifier < 0 && this.type !== "ability") {
                return "penalty";
            }
            return "modifier";
        })();

        if (this.force && this.type === "untyped") {
            throw ErrorPF2e("A forced modifier must have a type");
        }
    }

    get category(): this["damageCategory"] {
        return this.damageCategory;
    }

    get value(): number {
        return this.kind === "penalty" && this.modifier === 0 ? -this.modifier : this.modifier;
    }

    get signedValue(): string {
        return this.modifier === 0 && this.kind === "penalty"
            ? signedInteger(-this.modifier)
            : signedInteger(this.modifier);
    }

    /** Return a copy of this ModifierPF2e instance */
    clone(options: { test?: Set<string> | string[] } = {}): ModifierPF2e {
        const clone =
            this.modifier === this.#originalValue
                ? new ModifierPF2e(this)
                : new ModifierPF2e({ ...this, modifier: this.#originalValue });
        if (options.test) clone.test(options.test);

        return clone;
    }

    /**
     * Get roll options for this modifier. The current data structure makes for occasional inability to distinguish
     * bonuses and penalties.
     */
    getRollOptions(): Set<string> {
        const options = (["slug", "type", "value"] as const).map((p) => `${this.kind}:${p}:${this[p]}`);
        if (this.type === "ability" && this.ability) {
            options.push(`modifier:ability:${this.ability}`);
        }

        return new Set(options);
    }

    /** Sets the ignored property after testing the predicate */
    test(options: string[] | Set<string>): void {
        if (this.predicate.length === 0) return;
        const rollOptions = this.rule ? [...options, ...this.rule.item.getRollOptions("parent")] : options;
        this.ignored = !this.predicate.test(rollOptions);
    }

    toObject(): Required<RawModifier> {
        return duplicate({ ...this, item: undefined });
    }

    toString(): string {
        return this.label;
    }
}

interface ModifierObjectParams extends RawModifier {
    name?: string;
    rule?: RuleElementPF2e | null;
}

type ModifierOrderedParams = [
    slug: string,
    modifier: number,
    type?: ModifierType,
    enabled?: boolean,
    ignored?: boolean,
    source?: string,
    notes?: string,
];

/**
 * Create a modifier for a given attribute type.
 * @returns The modifier of the given attribute
 */
function createAttributeModifier({ actor, attribute, domains, max }: CreateAbilityModifierParams): ModifierPF2e {
    const withAttributeBased = domains.includes(`${attribute}-based`) ? domains : [...domains, `${attribute}-based`];
    const modifierValue = actor.abilities[attribute].mod;
    const cappedValue = Math.min(modifierValue, max ?? modifierValue);

    return new ModifierPF2e({
        slug: attribute,
        label: CONFIG.PF2E.abilities[attribute],
        modifier: cappedValue,
        type: "ability",
        ability: attribute,
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, withAttributeBased, attribute),
    });
}

interface CreateAbilityModifierParams {
    actor: CharacterPF2e | NPCPF2e;
    attribute: AttributeString;
    domains: string[];
    /** An optional maximum for this ability modifier */
    max?: number;
}

/**
 * Create a modifier for a given proficiency level of some ability.
 * @returns The modifier for the given proficiency rank and character level.
 */
function createProficiencyModifier({
    actor,
    rank,
    domains,
    level,
    addLevel,
}: CreateProficiencyModifierParams): ModifierPF2e {
    rank = Math.clamped(rank, 0, 4) as ZeroToFour;
    addLevel ??= rank > 0;
    const pwolVariant = game.settings.get("pf2e", "proficiencyVariant");

    const baseBonuses: [number, number, number, number, number] = pwolVariant
        ? [
              game.settings.get("pf2e", "proficiencyUntrainedModifier"),
              game.settings.get("pf2e", "proficiencyTrainedModifier"),
              game.settings.get("pf2e", "proficiencyExpertModifier"),
              game.settings.get("pf2e", "proficiencyMasterModifier"),
              game.settings.get("pf2e", "proficiencyLegendaryModifier"),
          ]
        : [0, 2, 4, 6, 8];

    const addedLevel = addLevel && !pwolVariant ? level ?? actor.level : 0;
    const bonus = baseBonuses[rank] + addedLevel;

    return new ModifierPF2e({
        slug: "proficiency",
        label: `PF2E.ProficiencyLevel${rank}`,
        modifier: bonus,
        type: "proficiency",
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, domains, "proficiency"),
    });
}

interface CreateProficiencyModifierParams {
    actor: ActorPF2e;
    rank: ZeroToFour;
    domains: string[];
    /** If given, use this value instead of actor.level */
    level?: number;
    addLevel?: boolean;
}

/** A comparison which rates the first modifier as better than the second if it's modifier is at least as large. */
const HIGHER_BONUS = (a: ModifierPF2e, b: ModifierPF2e) => a.modifier >= b.modifier;
/** A comparison which rates the first modifier as better than the second if it's modifier is at least as small. */
const LOWER_PENALTY = (a: ModifierPF2e, b: ModifierPF2e) => a.modifier <= b.modifier;

/**
 * Given a current map of damage type -> best modifier, compare the given modifier against the current best modifier
 * and update it if it is better (according to the `isBetter` comparison function). Returns the delta in the total modifier
 * as a result of this update.
 */
function applyStacking(
    best: Record<string, ModifierPF2e>,
    modifier: ModifierPF2e,
    isBetter: (first: ModifierPF2e, second: ModifierPF2e) => boolean,
) {
    // If there is no existing bonus of this type, then add ourselves.
    const existing = best[modifier.type];
    if (existing === undefined) {
        modifier.enabled = true;
        best[modifier.type] = modifier;
        return modifier.modifier;
    }

    if (isBetter(modifier, existing)) {
        // If we are a better modifier according to the comparison, then we become the new 'best'.
        existing.enabled = false;
        modifier.enabled = true;
        best[modifier.type] = modifier;
        return modifier.modifier - existing.modifier;
    } else {
        // Otherwise, the existing modifier is better, so do nothing.
        modifier.enabled = false;
        return 0;
    }
}

/**
 * Applies the modifier stacking rules and calculates the total modifier. This will mutate the
 * provided modifiers, setting the 'enabled' field based on whether or not the modifiers are active.
 *
 * @param modifiers The list of modifiers to apply stacking rules for.
 * @returns The total modifier provided by the given list of modifiers.
 */
function applyStackingRules(modifiers: ModifierPF2e[]): number {
    let total = 0;
    const highestBonus: Record<string, ModifierPF2e> = {};
    const lowestPenalty: Record<string, ModifierPF2e> = {};

    // There are no ability bonuses or penalties, so always take the highest ability modifier.
    const abilityModifiers = modifiers.filter((m) => m.type === "ability" && !m.ignored);
    const bestAbility = abilityModifiers.reduce((best: ModifierPF2e | null, modifier): ModifierPF2e | null => {
        if (best === null) {
            return modifier;
        } else {
            return modifier.force ? modifier : best.force ? best : modifier.modifier > best.modifier ? modifier : best;
        }
    }, null);
    for (const modifier of abilityModifiers) {
        modifier.ignored = modifier !== bestAbility;
    }

    for (const modifier of modifiers) {
        // Always disable ignored modifiers and don't do anything further with them.
        if (modifier.ignored) {
            modifier.enabled = false;
            continue;
        }

        // Untyped modifiers always stack, so enable them and add their modifier.
        if (modifier.type === "untyped") {
            modifier.enabled = true;
            total += modifier.modifier;
            continue;
        }

        // Otherwise, apply stacking rules to positive modifiers and negative modifiers separately.
        if (modifier.modifier < 0) {
            total += applyStacking(lowestPenalty, modifier, LOWER_PENALTY);
        } else {
            total += applyStacking(highestBonus, modifier, HIGHER_BONUS);
        }
    }

    return total;
}

/**
 * Represents a statistic on an actor and its commonly applied modifiers. Each statistic or check can have multiple
 * modifiers, even of the same type, but the stacking rules are applied to ensure that only a single bonus and penalty
 * of each type is applied to the total modifier.
 */
class StatisticModifier {
    /** The slug of this collection of modifiers for a statistic. */
    slug: string;
    /** The display label of this statistic */
    declare label?: string;
    /** The list of modifiers which affect the statistic. */
    protected _modifiers: ModifierPF2e[];
    /** The total modifier for the statistic, after applying stacking rules. */
    declare totalModifier: number;
    /** A textual breakdown of the modifiers factoring into this statistic */
    breakdown = "";
    /** Optional notes, which are often added to statistic modifiers */
    notes?: RollNotePF2e[];

    /**
     * @param slug The name of this collection of statistic modifiers.
     * @param modifiers All relevant modifiers for this statistic.
     * @param rollOptions Roll options used for initial total calculation
     */
    constructor(slug: string, modifiers: ModifierPF2e[] = [], rollOptions: string[] | Set<string> = new Set()) {
        rollOptions = rollOptions instanceof Set ? rollOptions : new Set(rollOptions);
        this.slug = slug;

        // De-duplication. Prefer higher valued
        const seen = modifiers.reduce((result: Record<string, ModifierPF2e>, modifier) => {
            const existing = result[modifier.slug];
            if (!existing?.enabled || Math.abs(modifier.modifier) > Math.abs(result[modifier.slug].modifier)) {
                result[modifier.slug] = modifier;
            }
            return result;
        }, {});
        this._modifiers = Object.values(seen);

        this.calculateTotal(rollOptions);
    }

    /** Get the list of all modifiers in this collection */
    get modifiers(): ModifierPF2e[] {
        return [...this._modifiers];
    }

    /** Add a modifier to the end of this collection. */
    push(modifier: ModifierPF2e): number {
        // de-duplication. If an existing one exists, replace if higher valued
        const existingIdx = this._modifiers.findIndex((o) => o.slug === modifier.slug);
        const existing = this._modifiers[existingIdx];
        if (!existing) {
            this._modifiers.push(modifier);
            this.calculateTotal();
        } else if (Math.abs(modifier.modifier) > Math.abs(existing.modifier)) {
            this._modifiers[existingIdx] = modifier;
            this.calculateTotal();
        }

        return this._modifiers.length;
    }

    /** Add a modifier to the beginning of this collection. */
    unshift(modifier: ModifierPF2e): number {
        // de-duplication
        if (this._modifiers.find((o) => o.slug === modifier.slug) === undefined) {
            this._modifiers.unshift(modifier);
            this.calculateTotal();
        }
        return this._modifiers.length;
    }

    /** Delete a modifier from this collection by name or reference */
    delete(modifierSlug: string | ModifierPF2e): boolean {
        const toDelete =
            typeof modifierSlug === "object"
                ? modifierSlug
                : this._modifiers.find((modifier) => modifier.slug === modifierSlug);
        const wasDeleted =
            toDelete && this._modifiers.includes(toDelete)
                ? !!this._modifiers.findSplice((modifier) => modifier === toDelete)
                : false;
        if (wasDeleted) this.calculateTotal();

        return wasDeleted;
    }

    /** Obtain the total modifier, optionally retesting predicates, and finally applying stacking rules. */
    calculateTotal(rollOptions: Set<string> = new Set()): void {
        if (rollOptions.size > 0) {
            for (const modifier of this._modifiers) {
                modifier.test(rollOptions);
            }

            adjustModifiers(this._modifiers, rollOptions);
        }

        applyStackingRules(this._modifiers);

        this.totalModifier = this._modifiers.filter((m) => m.enabled).reduce((total, m) => total + m.modifier, 0);
    }
}

function adjustModifiers(modifiers: ModifierPF2e[], rollOptions: Set<string>): void {
    for (const modifier of [...modifiers].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))) {
        const adjustments = modifier.adjustments.filter((a) => a.test([...rollOptions, ...modifier.getRollOptions()]));
        if (adjustments.some((a) => a.suppress)) {
            modifier.ignored = true;
            continue;
        }

        type ResolvedAdjustment = { value: number; relabel: string | null };
        const resolvedAdjustment = adjustments.reduce(
            (resolved: ResolvedAdjustment, adjustment) => {
                const newValue = adjustment.getNewValue?.(resolved.value) ?? resolved.value;
                if (newValue !== resolved.value) {
                    resolved.value = newValue;
                    resolved.relabel = adjustment.relabel ?? null;
                }
                return resolved;
            },
            { value: modifier.modifier, relabel: null },
        );
        modifier.modifier = resolvedAdjustment.value;

        if (resolvedAdjustment.relabel) {
            modifier.label = game.i18n.localize(resolvedAdjustment.relabel);
        }

        // If applicable, change the damage type of this modifier, using only the final adjustment found
        modifier.damageType = adjustments.reduce(
            (damageType: DamageType | null, adjustment) => adjustment.getDamageType?.(damageType) ?? damageType,
            modifier.damageType,
        );
    }
}

/**
 * Represents the list of modifiers for a specific check.
 * @category PF2
 */
class CheckModifier extends StatisticModifier {
    /**
     * @param slug The unique slug of this check modifier
     * @param statistic The statistic modifier to copy fields from
     * @param modifiers Additional modifiers to add to this check
     */
    constructor(
        slug: string,
        statistic: { modifiers: readonly (ModifierPF2e | RawModifier)[] },
        modifiers: ModifierPF2e[] = [],
        rollOptions: string[] | Set<string> = new Set(),
    ) {
        const baseModifiers = statistic.modifiers.map((m) => ("clone" in m ? m.clone() : new ModifierPF2e(m)));
        super(slug, baseModifiers.concat(modifiers), rollOptions);
    }
}

interface DamageDiceOverride {
    /** Upgrade the damage dice to the next higher size (maximum d12) */
    upgrade?: boolean;

    /** Downgrade the damage dice to the next lower size (minimum d4) */
    downgrade?: boolean;

    /** Override with a set dice size */
    dieSize?: DamageDieSize;

    /** Override the damage type */
    damageType?: DamageType;

    /** Override the number of damage dice */
    diceNumber?: number;
}

type PartialParameters = Partial<Omit<DamageDicePF2e, "predicate">> & Pick<DamageDicePF2e, "selector" | "slug">;
interface DamageDiceParameters extends PartialParameters {
    predicate?: RawPredicate;
}

class DamageDicePF2e {
    /** A selector of an actor's associated damaging statistic  */
    selector: string;

    slug: string;
    label: string;
    /** The number of dice to add. */
    diceNumber: number;
    /** The size of the dice to add. */
    dieSize: DamageDieSize | null;
    /**
     * True means the dice are added to critical without doubling; false means the dice are never added to critical
     * damage; omitted means add to normal damage and double on critical damage.
     */
    critical: boolean | null;
    /** The damage category of these dice. */
    category: "persistent" | "precision" | "splash" | null;
    damageType: DamageType | null;
    /** If true, these dice overide the base damage dice of the weapon. */
    override: DamageDiceOverride | null;
    ignored: boolean;
    enabled: boolean;
    custom: boolean;
    predicate: PredicatePF2e;

    constructor(params: DamageDiceParameters) {
        if (params.selector) {
            this.selector = params.selector;
        } else {
            throw ErrorPF2e("`selector` is mandatory");
        }

        this.label = game.i18n.localize(params.label ?? "");
        this.slug = sluggify(params.slug ?? this.label);
        if (!this.slug) {
            throw ErrorPF2e("A DiceModifier must have a slug");
        }

        this.diceNumber = params.diceNumber ?? 0;
        this.dieSize = params.dieSize ?? null;
        this.damageType = params.damageType ?? null;
        this.category = params.category ?? null;
        this.override = params.override ?? null;
        this.custom = params.custom ?? false;

        this.category = tupleHasValue(["persistent", "precision", "splash"], params.category)
            ? params.category
            : this.damageType === "bleed"
            ? "persistent"
            : null;
        this.critical = this.category === "splash" ? !!params.critical : params.critical ?? null;

        this.predicate =
            params.predicate instanceof PredicatePF2e ? params.predicate : new PredicatePF2e(params.predicate ?? []);

        this.enabled = params.enabled ?? this.predicate.test([]);
        this.ignored = params.ignored ?? !this.enabled;
    }

    /** Test the `predicate` against a set of roll options */
    test(options: Set<string>): void {
        this.enabled = this.predicate.test(options);
        this.ignored = !this.enabled;
    }

    clone(): DamageDicePF2e {
        return new DamageDicePF2e(this);
    }

    toObject(): RawDamageDice {
        return {
            ...this,
            predicate: deepClone([...this.predicate]),
        };
    }
}

type RawDamageDice = Required<DamageDiceParameters>;

export {
    CheckModifier,
    DamageDicePF2e,
    MODIFIER_TYPES,
    ModifierPF2e,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
    adjustModifiers,
    applyStackingRules,
    createAttributeModifier,
    createProficiencyModifier,
    ensureProficiencyOption,
};
export type {
    BaseRawModifier,
    DamageDiceOverride,
    DamageDiceParameters,
    DeferredPromise,
    DeferredValue,
    DeferredValueParams,
    ModifierAdjustment,
    ModifierType,
    RawModifier,
    TestableDeferredValueParams,
};
