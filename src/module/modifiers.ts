import { AbilityString } from "@actor/data/base";
import { DamageCategory, DamageDieSize } from "@system/damage/damage";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { ErrorPF2e, sluggify } from "../util";
import { RollNotePF2e } from "./notes";

export const PROFICIENCY_RANK_OPTION = [
    "proficiency:untrained",
    "proficiency:trained",
    "proficiency:expert",
    "proficiency:master",
    "proficiency:legendary",
] as const;

export function ensureProficiencyOption(options: string[], proficiencyRank: number) {
    if (proficiencyRank >= 0 && !options.some((option) => option.toLowerCase().startsWith("proficiency:"))) {
        options.push(PROFICIENCY_RANK_OPTION[proficiencyRank]);
    }
}

/**
 * The canonical pathfinder modifier types; modifiers of the same type do not stack (except for 'untyped' modifiers,
 * which fully stack).
 */
export const MODIFIER_TYPE = Object.freeze({
    ABILITY: "ability",
    PROFICIENCY: "proficiency",
    CIRCUMSTANCE: "circumstance",
    ITEM: "item",
    POTENCY: "potency",
    STATUS: "status",
    UNTYPED: "untyped",
} as const);

export const MODIFIER_TYPES = [
    "ability",
    "circumstance",
    "item",
    "potency",
    "proficiency",
    "status",
    "untyped",
] as const;

export type ModifierType = typeof MODIFIER_TYPE[keyof typeof MODIFIER_TYPE];

export interface BaseRawModifier {
    /** An identifier for this modifier; should generally be a localization key (see en.json). */
    slug?: string;
    /**
     * Both a slug and a label
     * @deprecated
     */
    name?: string;
    /** The display name of this modifier; can be a localization key (see en.json). */
    label: string;
    /** The actual numeric benefit/penalty that this modifier provides. */
    modifier?: number;
    /** The type of this modifier - modifiers of the same type do not stack (except for `untyped` modifiers). */
    type?: string;
    /** If the type is "ability", this should be set to a particular ability */
    ability?: AbilityString | null;
    /** If true, this modifier will be applied to the final roll; if false, it will be ignored. */
    enabled?: boolean;
    /** If true, these custom dice are being ignored in the damage calculation. */
    ignored?: boolean;
    /** The source from which this modifier originates, if any. */
    source?: string;
    /** If true, this modifier is a custom player-provided modifier. */
    custom?: boolean;
    /** The damage type that this modifier does, if it modifies a damage roll. */
    damageType?: string;
    /** The damage category */
    damageCategory?: string;
    /** A predicate which determines when this modifier is active. */
    predicate?: RawPredicate;
    /** If true, this modifier is only active on a critical hit. */
    critical?: boolean;
    /** Any notes about this modifier. */
    notes?: string;
    /** The list of traits that this modifier gives to the underlying attack, if any. */
    traits?: string[];
}

export interface RawModifier extends BaseRawModifier {
    modifier: number;
}

/** Represents a discrete modifier, bonus, or penalty, to a statistic or check. */
export class ModifierPF2e implements RawModifier {
    slug: string;
    label: string;
    modifier: number;
    type: ModifierType;
    ability: AbilityString | null = null;
    enabled: boolean;
    ignored: boolean;
    source?: string;
    custom: boolean;
    damageType?: string;
    damageCategory?: string;
    predicate: PredicatePF2e;
    critical?: boolean;
    traits?: string[];
    notes?: string;

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
    constructor(args: RawModifier);
    constructor(...args: ModifierOrderedParams);
    constructor(...args: [RawModifier] | ModifierOrderedParams) {
        const isLegacyParams = (args: [RawModifier] | ModifierOrderedParams): args is ModifierOrderedParams =>
            typeof args[0] === "string";
        const params: RawModifier = isLegacyParams(args)
            ? {
                  label: args[0],
                  modifier: args[1],
                  type: args[2] ?? "untyped",
                  enabled: args[3],
                  ignored: args[4],
                  source: args[5],
                  notes: args[6],
              }
            : args[0];

        const isValidModifierType = (type: unknown): type is ModifierType =>
            (Object.values(MODIFIER_TYPE) as unknown[]).includes(type);

        this.label = game.i18n.localize(params.label ?? params.name);
        this.slug = sluggify(params.slug ?? this.label);
        this.modifier = params.modifier;
        this.type = isValidModifierType(params.type) ? params.type : "untyped";
        this.ability = params.ability ?? null;
        this.damageType = params.damageType;
        this.damageCategory = params.damageCategory;
        this.enabled = params.enabled ?? true;
        this.ignored = params.ignored ?? false;
        this.custom = params.custom ?? false;
        this.source = params.source;
        this.predicate = new PredicatePF2e(params.predicate);
        this.notes = params.notes;
        this.traits = deepClone(params.traits ?? []);
    }

    /** Return a copy of this ModifierPF2e instance */
    clone(options: { test?: string[] } = {}): ModifierPF2e {
        const clone = new ModifierPF2e(this);
        if (options.test) clone.test(options.test);
        return clone;
    }

    /** Sets the ignored property after testing the predicate */
    test(options: string[]) {
        this.ignored = !this.predicate.test(options);
    }

    toString() {
        return this.label;
    }
}

type ModifierOrderedParams = [
    slug: string,
    modifier: number,
    type?: string,
    enabled?: boolean,
    ignored?: boolean,
    source?: string,
    notes?: string
];

export type MinimalModifier = Pick<ModifierPF2e, "slug" | "type" | "modifier">;

// Ability scores
export const AbilityModifier = {
    /**
     * Create a modifier from a given ability type and score.
     * @param ability str = Strength, dex = Dexterity, con = Constitution, int = Intelligence, wis = Wisdom, cha = Charisma
     * @param score The score of this ability.
     * @returns The modifier provided by the given ability score.
     */
    fromScore: (ability: AbilityString, score: number) => {
        return new ModifierPF2e({
            label: `PF2E.Ability${sluggify(ability, { camel: "bactrian" })}`,
            modifier: Math.floor((score - 10) / 2),
            type: MODIFIER_TYPE.ABILITY,
            ability,
        });
    },
};

// proficiency ranks
export const UNTRAINED = Object.freeze({
    atLevel: (_level: number) => {
        const modifier = (game.settings.get("pf2e", "proficiencyUntrainedModifier") as number | null) ?? 0;
        return new ModifierPF2e("PF2E.ProficiencyLevel0", modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const TRAINED = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get("pf2e", "proficiencyVariant") ?? "ProficiencyWithLevel";
        let modifier = game.settings.get("pf2e", "proficiencyTrainedModifier") ?? 2;
        if (rule === "ProficiencyWithLevel") {
            modifier += level;
        }
        return new ModifierPF2e("PF2E.ProficiencyLevel1", modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const EXPERT = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get("pf2e", "proficiencyVariant") ?? "ProficiencyWithLevel";
        let modifier = game.settings.get("pf2e", "proficiencyExpertModifier") ?? 4;
        if (rule === "ProficiencyWithLevel") {
            modifier += level;
        }
        return new ModifierPF2e("PF2E.ProficiencyLevel2", modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const MASTER = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get("pf2e", "proficiencyVariant") ?? "ProficiencyWithLevel";
        let modifier = game.settings.get("pf2e", "proficiencyMasterModifier") ?? 6;
        if (rule === "ProficiencyWithLevel") {
            modifier += level;
        }
        return new ModifierPF2e("PF2E.ProficiencyLevel3", modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const LEGENDARY = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get("pf2e", "proficiencyVariant") ?? "ProficiencyWithLevel";
        let modifier = game.settings.get("pf2e", "proficiencyLegendaryModifier") ?? 8;
        if (rule === "ProficiencyWithLevel") {
            modifier += level;
        }
        return new ModifierPF2e("PF2E.ProficiencyLevel4", modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const ProficiencyModifier = Object.freeze({
    /**
     * Create a modifier for a given proficiency level of some ability.
     * @param level The level of the character which this modifier is being applied to.
     * @param rank 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
     * @returns The modifier for the given proficiency rank and character level.
     */
    fromLevelAndRank: (level: number, rank: number): ModifierPF2e => {
        switch (rank || 0) {
            case 0:
                return UNTRAINED.atLevel(level);
            case 1:
                return TRAINED.atLevel(level);
            case 2:
                return EXPERT.atLevel(level);
            case 3:
                return MASTER.atLevel(level);
            case 4:
                return LEGENDARY.atLevel(level);
            default:
                return rank >= 5 ? LEGENDARY.atLevel(level) : UNTRAINED.atLevel(level);
        }
    },
});

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
    isBetter: (first: ModifierPF2e, second: ModifierPF2e) => boolean
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
export function applyStackingRules(modifiers: ModifierPF2e[]): number {
    let total = 0;
    const highestBonus: Record<string, ModifierPF2e> = {};
    const lowestPenalty: Record<string, ModifierPF2e> = {};

    // There are no ability bonuses or penalties, so always take the highest ability modifier.
    const abilityModifiers = modifiers.filter((m) => m.type === MODIFIER_TYPE.ABILITY && !m.ignored);
    const bestAbility = abilityModifiers.reduce((best: ModifierPF2e | null, modifier): ModifierPF2e | null => {
        if (best === null) {
            return modifier;
        } else {
            return modifier.modifier > best.modifier ? modifier : best;
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
        if (modifier.type === MODIFIER_TYPE.UNTYPED) {
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
export class StatisticModifier {
    /** The name of this collection of modifiers for a statistic. */
    name: string;
    /** The list of modifiers which affect the statistic. */
    protected _modifiers: ModifierPF2e[];
    /** The total modifier for the statistic, after applying stacking rules. */
    totalModifier!: number;
    /** A textual breakdown of the modifiers factoring into this statistic */
    breakdown = "";
    /** Optional notes, which are often added to statistic modifiers */
    notes?: RollNotePF2e[];
    /** Allow decorating this object with any needed extra fields. <-- ಠ_ಠ */
    [key: string]: any;

    /**
     * @param name The name of this collection of statistic modifiers.
     * @param modifiers All relevant modifiers for this statistic.
     */
    constructor(name: string, modifiers?: ModifierPF2e[]) {
        this.name = name;
        this._modifiers = modifiers ?? [];
        {
            // de-duplication
            const seen: ModifierPF2e[] = [];
            this._modifiers.filter((m) => {
                const found = seen.find((o) => o.slug === m.slug) !== undefined;
                if (!found || m.type === "ability") seen.push(m);
                return found;
            });
            this._modifiers = seen;
        }
        this.applyStackingRules();
    }

    /** Get the list of all modifiers in this collection (as a read-only list). */
    get modifiers(): readonly ModifierPF2e[] {
        return Object.freeze([...this._modifiers]);
    }

    /** Add a modifier to the end of this collection. */
    push(modifier: ModifierPF2e): number {
        // de-duplication
        if (this._modifiers.find((o) => o.slug === modifier.slug) === undefined) {
            this._modifiers.push(modifier);
            this.applyStackingRules();
        }
        return this._modifiers.length;
    }

    /** Add a modifier to the beginning of this collection. */
    unshift(modifier: ModifierPF2e): number {
        // de-duplication
        if (this._modifiers.find((o) => o.slug === modifier.slug) === undefined) {
            this._modifiers.unshift(modifier);
            this.applyStackingRules();
        }
        return this._modifiers.length;
    }

    /** Delete a modifier from this collection by name or reference */
    delete(modifierName: string | ModifierPF2e): boolean {
        const toDelete =
            typeof modifierName === "object"
                ? modifierName
                : this._modifiers.find((modifier) => modifier.slug === modifierName);
        const wasDeleted =
            toDelete && this._modifiers.includes(toDelete)
                ? !!this._modifiers.findSplice((modifier) => modifier === toDelete)
                : false;
        if (wasDeleted) this.applyStackingRules();

        return wasDeleted;
    }

    /** Apply stacking rules to the list of current modifiers, to obtain a total modifier. */
    applyStackingRules() {
        this.totalModifier = applyStackingRules(this._modifiers);
    }
}

/**
 * Represents the list of modifiers for a specific check.
 * @category PF2
 */
export class CheckModifier extends StatisticModifier {
    /**
     * @param name The name of this check modifier.
     * @param statistic The statistic modifier to copy fields from.
     * @param modifiers Additional modifiers to add to this check.
     */
    constructor(name: string, statistic: StatisticModifier, modifiers: ModifierPF2e[] = []) {
        super(name, statistic.modifiers.map((modifier) => modifier.clone()).concat(modifiers));
    }
}

interface DamageDiceOverride {
    dieSize?: DamageDieSize;
    damageType?: string;
}

/**
 * Represents extra damage dice for one or more weapons or attack actions.
 * @category PF2
 */
export class DiceModifierPF2e implements BaseRawModifier {
    slug: string;
    /**
     * Formerly both a slug and label; should prefer separately set slugs and labels
     * @deprecated
     */
    name?: string;
    label: string;
    /** The number of dice to add. */
    diceNumber: number;
    /** The size of the dice to add. */
    dieSize?: DamageDieSize;
    /**
     * True means the dice are added to critical without doubling; false means the dice are never added to critical
     * damage; omitted means add to normal damage and double on critical damage.
     */
    critical?: boolean;
    /** The damage category of these dice. */
    category?: string;
    damageType?: string;
    /** If true, these dice overide the base damage dice of the weapon. */
    override?: DamageDiceOverride;
    ignored: boolean;
    enabled: boolean;
    custom: boolean;
    predicate: PredicatePF2e;

    constructor(param: Partial<Omit<DiceModifierPF2e, "predicate">> & { slug?: string; predicate?: RawPredicate }) {
        this.label = game.i18n.localize(param.label ?? param.name ?? "");
        this.slug = sluggify(param.slug ?? this.label);
        if (!this.slug) {
            throw ErrorPF2e("A DiceModifier must have a slug");
        }

        this.diceNumber = param.diceNumber ?? 0; // zero dice is allowed
        this.dieSize = param.dieSize;
        this.critical = param.critical;
        this.damageType = param.damageType;
        this.category = param.category;
        this.override = param.override;
        this.custom = param.custom ?? false;

        if (this.damageType) {
            this.category ??= DamageCategory.fromDamageType(this.damageType);
        }

        this.predicate = new PredicatePF2e(param.predicate);
        this.enabled = PredicatePF2e.test!(this.predicate);
        this.ignored = !this.enabled;
    }
}

type PartialParameters = Partial<Omit<DamageDicePF2e, "predicate">> & Pick<DamageDicePF2e, "selector" | "slug">;
export interface DamageDiceParameters extends PartialParameters {
    predicate?: RawPredicate;
}

export class DamageDicePF2e extends DiceModifierPF2e {
    /** The selector used to determine when *has a stroke*  */
    selector: string;

    constructor(params: DamageDiceParameters) {
        const predicate =
            params.predicate instanceof PredicatePF2e ? params.predicate : new PredicatePF2e(params.predicate);
        super({ ...params, predicate });

        if (params.selector) {
            this.selector = params.selector;
        } else {
            throw ErrorPF2e("Selector is mandatory");
        }
    }
}
