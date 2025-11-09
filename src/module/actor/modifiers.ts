import type { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import type { AttributeString } from "@actor/types.ts";
import type { ItemPF2e } from "@item";
import { ZeroToFour } from "@module/data.ts";
import type { RollNotePF2e } from "@module/notes.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import type { RuleElement } from "@module/rules/index.ts";
import { DamageAlteration } from "@module/rules/rule-element/damage-alteration/alteration.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import type { DamageCategoryUnique, DamageDiceFaces, DamageDieSize, DamageType } from "@system/damage/types.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import { ErrorPF2e, objectHasKey, setHasElement, signedInteger, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";

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

interface RawModifier {
    /** An identifier for this modifier; should generally be a localization key (see en.json). */
    slug?: string;
    /** The domains of discourse to which this modifier belongs */
    domains?: string[];
    /** The display name of this modifier; can be a localization key (see en.json). */
    label: string;
    /** The actual numeric benefit/penalty that this modifier provides. */
    modifier: number;
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
    /** A predicate that determines when this modifier is active */
    predicate?: RawPredicate;
    /** If true, this modifier is only active on a critical hit. */
    critical?: boolean | null;
    /** A list of tags associated with this modifier */
    tags?: string[];
    /** Hide this modifier in UIs if it is disabled */
    hideIfDisabled?: boolean;
    /** Whether to use this bonus/penalty/modifier even if it isn't the greatest magnitude */
    force?: boolean;
}

interface ModifierAdjustment {
    /** A slug for matching against modifiers: `null` will match against all modifiers within a selector */
    slug: string | null;
    test: (options: string[] | Set<string>) => boolean;
    damageType?: DamageType;
    relabel?: string;
    suppress?: boolean;
    /** The number of times this adjustment has been applied to a single statistic */
    applications?: number;
    getNewValue?: (current: number) => number;
    getDamageType?: (current: DamageType | null) => DamageType | null;
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
    test: string[] | Set<string>;
}

interface DeferredDamageDiceOptions extends TestableDeferredValueParams {
    selectors: string[];
}

type DeferredValue<T> = (options?: DeferredValueParams) => T | null;
type DeferredPromise<T> = (options?: DeferredValueParams) => Promise<T | null>;

/** Represents a discrete modifier, bonus, or penalty, to a statistic or check. */
class Modifier implements RawModifier {
    slug: string;
    label: string;
    domains: string[];
    /** The value of the modifier */
    modifier: number;
    /** The value before adjustments are applied */
    #originalValue: number;

    type: ModifierType;
    ability: AttributeString | null;
    adjustments: ModifierAdjustment[];
    alterations: DamageAlteration[];
    force: boolean;
    enabled: boolean;
    ignored: boolean;
    /** The originating rule element of this modifier, if any: used to retrieve "parent" item roll options */
    rule: RuleElement | null;
    source: string | null;
    custom: boolean;
    damageType: DamageType | null;
    damageCategory: DamageCategoryUnique | null;
    predicate: Predicate;
    critical: boolean | null;
    tags: string[];
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
        this.domains = params.domains ?? [];
        this.force = params.force ?? false;
        this.adjustments = fu.deepClone(params.adjustments) ?? [];
        this.alterations = fu.deepClone(params.alterations) ?? [];
        this.enabled = params.enabled ?? true;
        this.ignored = params.ignored ?? false;
        this.custom = params.custom ?? false;
        this.source = params.source ?? null;
        this.predicate = new Predicate(params.predicate ?? []);
        this.tags = R.unique(fu.deepClone(params.tags) ?? []);
        this.hideIfDisabled = params.hideIfDisabled ?? false;

        this.rule = params.rule ?? null;
        // Prevent upstream from blindly diving into recursion loops
        Object.defineProperty(this, "rule", { enumerable: false });

        this.damageType = objectHasKey(CONFIG.PF2E.damageTypes, params.damageType) ? params.damageType : null;
        this.damageCategory = this.damageType === "bleed" ? "persistent" : (params.damageCategory ?? null);
        // Force splash damage into being critical-only or not doubling on critical hits
        this.critical = this.damageCategory === "splash" ? !!params.critical : (params.critical ?? null);

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

    /** Applies all adjustments to the original value */
    applyAdjustments({ rollOptions }: { rollOptions: Iterable<string> }): void {
        this.modifier = this.#originalValue;
        const allRollOptions = [...rollOptions, ...this.getRollOptions()];
        const adjustments = this.adjustments.filter((a) => a.test(allRollOptions));
        if (adjustments.some((a) => a.suppress)) {
            this.ignored = true;
            return;
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
            { value: this.modifier, relabel: null },
        );
        this.modifier = resolvedAdjustment.value;

        if (resolvedAdjustment.relabel) {
            this.label = game.i18n.localize(resolvedAdjustment.relabel);
        }

        // If applicable, change the damage type of this modifier, using only the final adjustment found
        this.damageType = adjustments.reduce(
            (damageType: DamageType | null, adjustment) => adjustment.getDamageType?.(damageType) ?? damageType,
            this.damageType,
        );
    }

    /**
     * Apply damage alterations: must be called externally by client code that knows this is a damage modifier.
     * @param options.item An item (typically a weapon or spell) producing damage as part of an action
     * @param options.test An `Array` or `Set` of roll options for use in predication testing
     */
    applyDamageAlterations(options: { item: ItemPF2e<ActorPF2e>; test: string[] | Set<string> }): void {
        for (const alteration of this.alterations) {
            alteration.applyTo(this, options);
        }
    }

    /** Return a copy of this ModifierPF2e instance */
    clone(data: Partial<ModifierObjectParams> = {}, options: { test?: Set<string> | string[] | null } = {}): Modifier {
        const clone = new Modifier({ ...this, modifier: this.#originalValue, rule: this.rule, ...data });
        if (options.test) clone.test(options.test);

        return clone;
    }

    /**
     * Get roll options for this modifier. The current data structure makes for occasional inability to distinguish
     * bonuses and penalties.
     */
    getRollOptions(): string[] {
        const options = (["slug", "type", "value"] as const).map((p) => `${this.kind}:${p}:${this[p]}`);
        if (this.type === "ability" && this.ability) {
            options.push(`modifier:ability:${this.ability}`);
        }
        options.push(...this.tags.map((t) => `${this.kind}:tag:${t}`));

        const damageKinds = [
            this.domains.some((d) => /\bdamage$/.test(d)) ? "damage" : null,
            this.domains.some((d) => /\bhealing$/.test(d)) ? "healing" : null,
        ].filter(R.isTruthy);

        for (const damageKind of damageKinds) {
            options.push(damageKind);
            options.push(`${this.kind}:${damageKind}`);

            if (this.damageType) {
                options.push(`${damageKind}:type:${this.damageType}`);
                options.push(`${this.kind}:${damageKind}:type:${this.damageType}`);
                const categoryFromType = DamageCategorization.fromDamageType(this.damageType);
                if (damageKind === "damage" && categoryFromType) {
                    options.push(`${damageKind}:category:${categoryFromType}`);
                    options.push(`${this.kind}:${damageKind}:category:${categoryFromType}`);
                }
            }
            if (this.damageCategory) {
                options.push(`${damageKind}:category:${this.damageCategory}`);
                options.push(`${this.kind}:${damageKind}:category:${this.damageCategory}`);
            }
            options.push(
                ...this.tags.flatMap((t) => [`${damageKind}:tag:${t}`, `${this.kind}:${damageKind}:tag:${t}`]),
            );
        }

        return options;
    }

    /** Sets the ignored property after testing the predicate */
    test(options: string[] | Set<string>): void {
        if (this.predicate.length === 0) return;
        const rollOptions = this.rule ? [...options, ...this.rule.item.getRollOptions("parent")] : options;
        this.enabled = this.predicate.test(rollOptions);
        this.ignored = !this.enabled;
    }

    toObject(): Required<RawModifier> {
        return {
            ...R.omit(this, ["alterations", "predicate", "rule"]),
            predicate: this.predicate.toObject(),
        };
    }

    toString(): string {
        return this.label;
    }
}

interface ModifierObjectParams extends RawModifier {
    name?: string;
    rule?: RuleElement | null;
    alterations?: DamageAlteration[];
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
function createAttributeModifier({ actor, attribute, domains, max }: CreateAbilityModifierParams): Modifier {
    const withAttributeBased = domains.includes(`${attribute}-based`) ? domains : [...domains, `${attribute}-based`];
    const modifierValue = actor.abilities[attribute].mod;
    const cappedValue = Math.min(modifierValue, max ?? modifierValue);

    return new Modifier({
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
}: CreateProficiencyModifierParams): Modifier {
    rank = Math.clamp(rank, 0, 4) as ZeroToFour;
    addLevel ??= rank > 0;
    const pwolVariant = game.pf2e.settings.variants.pwol.enabled;

    const baseBonuses: [number, number, number, number, number] = pwolVariant
        ? game.pf2e.settings.variants.pwol.modifiers
        : [0, 2, 4, 6, 8];

    const addedLevel = addLevel && !pwolVariant ? (level ?? actor.level) : 0;
    const bonus = baseBonuses[rank] + addedLevel;

    return new Modifier({
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
const HIGHER_BONUS = (a: Modifier, b: Modifier) => a.modifier >= b.modifier;
/** A comparison which rates the first modifier as better than the second if it's modifier is at least as small. */
const LOWER_PENALTY = (a: Modifier, b: Modifier) => a.modifier <= b.modifier;

/**
 * Given a current map of damage type -> best modifier, compare the given modifier against the current best modifier
 * and update it if it is better (according to the `isBetter` comparison function). Returns the delta in the total modifier
 * as a result of this update.
 */
function applyStacking(
    best: Record<string, Modifier>,
    modifier: Modifier,
    isBetter: (first: Modifier, second: Modifier) => boolean,
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
function applyStackingRules(modifiers: Modifier[]): number {
    let total = 0;
    const highestBonus: Record<string, Modifier> = {};
    const lowestPenalty: Record<string, Modifier> = {};

    // There are no ability bonuses or penalties, so always take the highest ability modifier.
    const abilityModifiers = modifiers.filter((m) => m.type === "ability" && !m.ignored);
    const bestAbility = abilityModifiers.reduce((best: Modifier | null, modifier): Modifier | null => {
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
    protected _modifiers: Modifier[];
    /** The total modifier for the statistic, after applying stacking rules. */
    declare totalModifier: number;
    /** A textual breakdown of the modifiers factoring into this statistic */
    breakdown = "";
    /** Optional notes, which are often added to statistic modifiers */
    notes?: RollNotePF2e[];
    /** Roll-option domains associated with this statistic */
    declare domains?: string[];

    /**
     * @param slug The name of this collection of statistic modifiers.
     * @param modifiers All relevant modifiers for this statistic.
     * @param rollOptions Roll options used for initial total calculation
     */
    constructor(slug: string, modifiers: Modifier[] = [], rollOptions: string[] | Set<string> = new Set()) {
        rollOptions = rollOptions instanceof Set ? rollOptions : new Set(rollOptions);
        this.slug = slug;

        // De-duplication. Prefer higher valued, and deprioritize disabled ones
        // This behavior is used by kingmaker to create "custom modifier types" via slugs,
        // as well as special skill modifiers when rolling manually
        const seen = modifiers.reduce((result: Record<string, Modifier>, modifier) => {
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
    get modifiers(): Modifier[] {
        return [...this._modifiers];
    }

    /** Add a modifier to the end of this collection. */
    push(modifier: Modifier): number {
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
    unshift(modifier: Modifier): number {
        // de-duplication
        if (this._modifiers.find((o) => o.slug === modifier.slug) === undefined) {
            this._modifiers.unshift(modifier);
            this.calculateTotal();
        }
        return this._modifiers.length;
    }

    /** Delete a modifier from this collection by name or reference */
    delete(modifierSlug: string | Modifier): boolean {
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

function adjustModifiers(modifiers: Modifier[], rollOptions: Set<string>): void {
    // Reset all adjustments for consistent behavior between repeat runs
    for (const modifier of modifiers) {
        for (const adjustment of modifier.adjustments) {
            adjustment.applications = 0;
        }
    }

    for (const modifier of [...modifiers].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))) {
        modifier.applyAdjustments({ rollOptions });
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
        statistic: { modifiers: readonly Modifier[] },
        modifiers: Modifier[] = [],
        rollOptions: string[] | Set<string> = new Set(),
    ) {
        const baseModifiers = statistic.modifiers
            .filter((modifier: unknown) => {
                if (modifier instanceof Modifier) return true;
                if (R.isObjectType(modifier) && "slug" in modifier && typeof modifier.slug === "string") {
                    ui.notifications.error(`Unsupported modifier object (slug: ${modifier.slug}) passed`);
                }
                return false;
            })
            .map((m) => m.clone());
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
    /** A list of tags associated with this damage */
    tags: string[];
    /** If true, these dice overide the base damage dice of the weapon. */
    override: DamageDiceOverride | null;
    ignored: boolean;
    enabled: boolean;
    predicate: Predicate;
    alterations: DamageAlteration[];
    hideIfDisabled: boolean;

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
        this.alterations = [params.alterations ?? []].flat();

        this.category = tupleHasValue(["persistent", "precision", "splash"], params.category)
            ? params.category
            : this.damageType === "bleed"
              ? "persistent"
              : null;
        this.critical = this.category === "splash" ? !!params.critical : (params.critical ?? null);
        this.tags = R.unique(fu.deepClone(params.tags) ?? []);
        this.predicate =
            params.predicate instanceof Predicate ? params.predicate : new Predicate(params.predicate ?? []);

        this.enabled = params.enabled ?? this.predicate.test([]);
        this.ignored = params.ignored ?? !this.enabled;
        this.hideIfDisabled = params.hideIfDisabled ?? false;
    }

    /** The `dieSize` as a number (or null) */
    get faces(): DamageDiceFaces | null {
        return (Number(this.dieSize?.replace("d", "")) || null) as DamageDiceFaces | null;
    }

    /** Test the `predicate` against a set of roll options */
    test(options: Set<string>): void {
        this.enabled = this.predicate.test(options);
        this.ignored = !this.enabled;
    }

    /** Get roll options for set of dice using a "dice:" prefix. */
    getRollOptions(): string[] {
        const damageKind = this.selector.endsWith("healing") ? "healing" : "damage";
        const categoryFromType = DamageCategorization.fromDamageType(this.damageType ?? "untyped");

        return [
            damageKind,
            `dice:slug:${this.slug}`,
            `dice:number:${this.diceNumber}`,
            `dice:faces:${this.dieSize}`,
            `dice:${damageKind}`,
            this.category
                ? [`${damageKind}:category:${this.category}`, `dice:${damageKind}:category:${this.category}`]
                : [],
            categoryFromType
                ? [`${damageKind}:category:${categoryFromType}`, `dice:${damageKind}:category:${categoryFromType}`]
                : [],
            this.damageType
                ? [`${damageKind}:type:${this.damageType}`, `dice:${damageKind}:type:${this.damageType}`]
                : [],
            this.tags.flatMap((t) => [`${damageKind}:tag:${t}`, `dice:tag:${t}`]),
        ].flat();
    }

    /**
     * Apply damage alterations: must be called externally by client code that knows this is a damage modifier.
     * @param options.item An item (typically a weapon or spell) producing damage as part of an action
     * @param options.test An `Array` or `Set` of roll options for use in predication testing
     */
    applyAlterations(options: { item: ItemPF2e<ActorPF2e>; test: string[] | Set<string> }): void {
        for (const alteration of this.alterations) {
            alteration.applyTo(this, options);
        }
    }

    clone(): DamageDicePF2e {
        return new DamageDicePF2e(this);
    }

    toObject(): RawDamageDice {
        return {
            ...R.omit(this, ["alterations", "predicate"]),
            alterations: [],
            predicate: this.predicate.toObject(),
        };
    }
}

interface RawDamageDice extends Required<DamageDiceParameters> {}

export {
    adjustModifiers,
    applyStackingRules,
    CheckModifier,
    createAttributeModifier,
    createProficiencyModifier,
    DamageDicePF2e,
    ensureProficiencyOption,
    Modifier,
    MODIFIER_TYPES,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
};

export type {
    DamageDiceOverride,
    DamageDiceParameters,
    DeferredDamageDiceOptions,
    DeferredPromise,
    DeferredValue,
    DeferredValueParams,
    ModifierAdjustment,
    ModifierObjectParams,
    ModifierType,
    RawDamageDice,
    RawModifier,
    TestableDeferredValueParams,
};
