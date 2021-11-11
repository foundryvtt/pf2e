import { AbilityString } from "@actor/data/base";
import { DamageCategory, DamageDieSize } from "@system/damage/damage";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { ErrorPF2e } from "../util";

export const PROFICIENCY_RANK_OPTION = Object.freeze([
    "proficiency:untrained",
    "proficiency:trained",
    "proficiency:expert",
    "proficiency:master",
    "proficiency:legendary",
]);

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

export type ModifierType = typeof MODIFIER_TYPE[keyof typeof MODIFIER_TYPE];

export interface RawModifier {
    /** The name of this modifier; should generally be a localization key (see en.json). */
    name: string;
    /** The display name of this modifier, overriding the name field if specific; can be a localization key (see en.json). */
    label?: string;
    /** The actual numeric benefit/penalty that this modifier provides. */
    modifier?: number;
    /** The type of this modifier - modifiers of the same type do not stack (except for `untyped` modifiers). */
    type?: ModifierType;
    /** If true, this modifier will be applied to the final roll; if false, it will be ignored. */
    enabled: boolean;
    /** If true, these custom dice are being ignored in the damage calculation. */
    ignored: boolean;
    /** The source from which this modifier originates, if any. */
    source?: string;
    /** If true, this modifier is a custom player-provided modifier. */
    custom: boolean;
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
    /** The list of roll options to use during actor data preparation instead of the default roll options for the statistic */
    defaultRollOptions?: string[];
}

/**
 * Represents a discrete modifier, either bonus or penalty, to a statistic or check.
 * @category PF2
 */
export class ModifierPF2e implements RawModifier {
    name: string;
    label?: string;
    modifier: number;
    type: ModifierType;
    enabled: boolean;
    ignored: boolean;
    source?: string;
    custom: boolean;
    damageType?: string;
    damageCategory?: string;
    predicate = new PredicatePF2e();
    critical?: boolean;
    traits?: string[];
    notes?: string;
    defaultRollOptions?: string[];

    /**
     * Create a new modifier.
     * @param name The name for the modifier; should generally be a localization key.
     * @param modifier The actual numeric benefit/penalty that this modifier provides.
     * @param type The type of the modifier - modifiers of the same type do not stack (except for `untyped` modifiers).
     * @param enabled If true, this modifier will be applied to the result; otherwise, it will not.
     * @param source The source which this modifier originates from, if any.
     * @param notes Any notes about this modifier.
     */
    constructor(
        name: string,
        modifier: number,
        type: string,
        enabled = true,
        ignored = false,
        source?: string,
        notes?: string
    ) {
        const isValidModifierType = (type: string): type is ModifierType =>
            Object.values(MODIFIER_TYPE).some((modifierType) => type === modifierType);

        this.name = name;
        this.modifier = modifier;
        this.type = isValidModifierType(type) ? type : "untyped";
        this.enabled = enabled;
        this.ignored = ignored;
        this.custom = false;
        this.source = source;
        this.notes = notes;
    }

    /** Create a ModifierPF2e instance from a RawModifier */
    static fromObject(data: RawModifier): ModifierPF2e {
        if (data instanceof ModifierPF2e) return data.clone();

        const modifier = new ModifierPF2e(
            data.name,
            data.modifier ?? 0,
            data.type ?? "untyped",
            data.enabled,
            data.ignored,
            data.source,
            data.notes
        );

        modifier.custom = data.custom ?? false;
        modifier.predicate =
            data.predicate instanceof PredicatePF2e ? Object.create(data.predicate) : new PredicatePF2e(data.predicate);
        if (data.damageCategory) modifier.damageCategory = data.damageCategory;
        if (data.damageType) modifier.damageType = data.damageType;

        return modifier;
    }

    /** Return a copy of this ModifierPF2e instance */
    clone(): ModifierPF2e {
        const clone = new ModifierPF2e(
            this.name,
            this.modifier,
            this.type,
            this.enabled,
            this.ignored,
            this.source,
            this.notes
        );
        clone.predicate = deepClone(this.predicate);
        clone.custom = this.custom;
        clone.ignored = this.ignored;
        clone.damageType = this.damageType;
        clone.damageCategory = this.damageCategory;
        clone.critical = this.critical;
        clone.traits = deepClone(this.traits);
        clone.defaultRollOptions = deepClone(this.defaultRollOptions);

        return clone;
    }
}

export type MinimalModifier = Pick<ModifierPF2e, "name" | "type" | "modifier">;

// ability scores
export const STRENGTH = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e("PF2E.AbilityStr", Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const DEXTERITY = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e("PF2E.AbilityDex", Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const CONSTITUTION = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e("PF2E.AbilityCon", Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const INTELLIGENCE = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e("PF2E.AbilityInt", Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const WISDOM = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e("PF2E.AbilityWis", Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const CHARISMA = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e("PF2E.AbilityCha", Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const AbilityModifier = Object.freeze({
    /**
     * Create a modifier from a given ability type and score.
     * @param ability str = Strength, dex = Dexterity, con = Constitution, int = Intelligence, wis = Wisdom, cha = Charisma
     * @param score The score of this ability.
     * @returns The modifier provided by the given ability score.
     */
    fromAbilityScore: (ability: AbilityString, score: number) => {
        switch (ability) {
            case "str":
                return STRENGTH.withScore(score);
            case "dex":
                return DEXTERITY.withScore(score);
            case "con":
                return CONSTITUTION.withScore(score);
            case "int":
                return INTELLIGENCE.withScore(score);
            case "wis":
                return WISDOM.withScore(score);
            case "cha":
                return CHARISMA.withScore(score);
            default:
                // Throwing an actual error can completely break the sheet. Instead, log
                // and use 0 for the modifier
                console.error(`invalid ability abbreviation: ${ability}`);
                return new ModifierPF2e("PF2E.AbilityUnknown", 0, MODIFIER_TYPE.ABILITY);
        }
    },
});

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
function applyStackingRules(modifiers: ModifierPF2e[]): number {
    let total = 0;
    const highestBonus: Record<string, ModifierPF2e> = {};
    const lowestPenalty: Record<string, ModifierPF2e> = {};

    // There are no ability bonuses or penalties, so always take the highest ability modifier.
    const abilityModifiers = modifiers.filter((m) => m.type === MODIFIER_TYPE.ABILITY);
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
                const found = seen.find((o) => o.name === m.name) !== undefined;
                if (!found) seen.push(m);
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
        if (this._modifiers.find((o) => o.name === modifier.name) === undefined) {
            this._modifiers.push(modifier);
            this.applyStackingRules();
        }
        return this._modifiers.length;
    }

    /** Add a modifier to the beginning of this collection. */
    unshift(modifier: ModifierPF2e): number {
        // de-duplication
        if (this._modifiers.find((o) => o.name === modifier.name) === undefined) {
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
                : this._modifiers.find((modifier) => modifier.name === modifierName);
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
export class DiceModifierPF2e implements RawModifier {
    name: string;
    label?: string;
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
    traits: string[];
    /** If true, these dice overide the base damage dice of the weapon. */
    override?: DamageDiceOverride;
    ignored: boolean;
    enabled: boolean;
    custom: boolean;
    predicate: PredicatePF2e;

    constructor(param: Partial<Omit<DiceModifierPF2e, "predicate">> & { name: string; predicate?: RawPredicate }) {
        if (param.name) {
            this.name = param.name;
        } else {
            throw ErrorPF2e("Name is mandatory");
        }

        this.label = param.label;
        this.diceNumber = param.diceNumber ?? 0; // zero dice is allowed
        this.dieSize = param.dieSize;
        this.critical = param.critical;
        this.damageType = param.damageType;
        this.category = param.category;
        this.traits = param.traits ?? [];
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

type PartialParameters = Partial<Omit<DamageDicePF2e, "predicate">> & Pick<DamageDicePF2e, "selector" | "name">;
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
