import { AbilityString } from '@actor/data/base';
import { DamageCategory, DamageDieSize } from '@system/damage/damage';

export const PROFICIENCY_RANK_OPTION = Object.freeze([
    'proficiency:untrained',
    'proficiency:trained',
    'proficiency:expert',
    'proficiency:master',
    'proficiency:legendary',
]);

export function ensureProficiencyOption(options: string[], proficiencyRank: number) {
    if (proficiencyRank >= 0 && !options.some((option) => option.toLowerCase().startsWith('proficiency:'))) {
        options.push(PROFICIENCY_RANK_OPTION[proficiencyRank]);
    }
}

/**
 * The canonical pathfinder modifier types; modifiers of the same type do not stack (except for 'untyped' modifiers,
 * which fully stack).
 */
export const MODIFIER_TYPE = Object.freeze({
    ABILITY: 'ability',
    PROFICIENCY: 'proficiency',
    CIRCUMSTANCE: 'circumstance',
    ITEM: 'item',
    POTENCY: 'potency',
    STATUS: 'status',
    UNTYPED: 'untyped',
} as const);

export type ModifierType = typeof MODIFIER_TYPE[keyof typeof MODIFIER_TYPE];

export interface RawModifier {
    /** The name of this modifier; should generally be a localization key (see en.json). */
    name: string;
    /** The display name of this modifier, overriding the name field if specific; can be a localization key (see en.json). */
    label?: string;
    /** If true, this modifier will be applied to the final roll; if false, it will be ignored. */
    enabled: boolean;
    /** If true, these custom dice are being ignored in the damage calculation. */
    ignored: boolean;
    /** If true, this modifier is a custom player-provided modifier. */
    custom: boolean;
    /** The damage type that this modifier does, if it modifies a damage roll. */
    damageType?: string;
    /** A predicate which determines when this modifier is active. */
    predicate: RawPredicate;
    /** If true, this modifier is only active on a critical hit. */
    critical?: boolean;
    /** The list of traits that this modifier gives to the underlying attack, if any. */
    traits?: string[];
}

/**
 * Represents a discrete modifier, either bonus or penalty, to a statistic or check.
 * @category PF2
 */
export class ModifierPF2e implements RawModifier {
    name: string;
    label?: string;
    /** The actual numeric benefit/penalty that this modifier provides. */
    modifier: number;
    /** The type of this modifier - modifiers of the same type do not stack (except for `untyped` modifiers). */
    type: ModifierType;
    enabled: boolean;
    /** The source which this modifier originates from, if any. */
    source?: string;
    /** Any notes about this modifier. */
    notes?: string;
    ignored: boolean;
    custom: boolean;
    damageType?: string;
    /** The damage category */
    damageCategory?: string;
    predicate: RawPredicate = new ModifierPredicate();
    critical?: boolean;
    traits?: string[];
    /** Status of automation (rules or active effects) applied to this modifier */
    automation: { key: string | null; enabled: boolean } = {
        key: null,
        enabled: false,
    };

    /**
     * Create a new modifier.
     * @param name The name for the modifier; should generally be a localization key.
     * @param modifier The actual numeric benefit/penalty that this modifier provides.
     * @param type The type of the modifier - modifiers of the same type do not stack (except for `untyped` modifiers).
     * @param enabled If true, this modifier will be applied to the result; otherwise, it will not.
     * @param source The source which this modifier originates from, if any.
     * @param notes Any notes about this modifier.
     */
    constructor(name: string, modifier: number, type: string, enabled = true, source?: string, notes?: string) {
        const isValidModifierType = (type: string): type is ModifierType =>
            Object.values(MODIFIER_TYPE).some((modifierType) => type === modifierType);

        this.name = name;
        this.modifier = modifier;
        this.type = isValidModifierType(type) ? type : 'untyped';
        this.enabled = enabled;
        this.ignored = false;
        this.custom = false;
        this.source = source;
        this.notes = notes;
    }
}

export type MinimalModifier = Pick<ModifierPF2e, 'name' | 'type' | 'modifier'>;

// ability scores
export const STRENGTH = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e('PF2E.AbilityStr', Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const DEXTERITY = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e('PF2E.AbilityDex', Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const CONSTITUTION = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e('PF2E.AbilityCon', Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const INTELLIGENCE = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e('PF2E.AbilityInt', Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const WISDOM = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e('PF2E.AbilityWis', Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
});
export const CHARISMA = Object.freeze({
    withScore: (score: number) =>
        new ModifierPF2e('PF2E.AbilityCha', Math.floor((score - 10) / 2), MODIFIER_TYPE.ABILITY),
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
            case 'str':
                return STRENGTH.withScore(score);
            case 'dex':
                return DEXTERITY.withScore(score);
            case 'con':
                return CONSTITUTION.withScore(score);
            case 'int':
                return INTELLIGENCE.withScore(score);
            case 'wis':
                return WISDOM.withScore(score);
            case 'cha':
                return CHARISMA.withScore(score);
            default:
                // Throwing an actual error can completely break the sheet. Instead, log
                // and use 0 for the modifier
                console.error(`invalid ability abbreviation: ${ability}`);
                return new ModifierPF2e('PF2E.AbilityUnknown', 0, MODIFIER_TYPE.ABILITY);
        }
    },
});

// proficiency ranks
export const UNTRAINED = Object.freeze({
    atLevel: (_level: number) => {
        const modifier = (game.settings.get('pf2e', 'proficiencyUntrainedModifier') as number | null) ?? 0;
        return new ModifierPF2e('PF2E.ProficiencyLevel0', modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const TRAINED = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyTrainedModifier') ?? 2;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new ModifierPF2e('PF2E.ProficiencyLevel1', modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const EXPERT = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyExpertModifier') ?? 4;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new ModifierPF2e('PF2E.ProficiencyLevel2', modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const MASTER = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyMasterModifier') ?? 6;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new ModifierPF2e('PF2E.ProficiencyLevel3', modifier, MODIFIER_TYPE.PROFICIENCY);
    },
});
export const LEGENDARY = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyLegendaryModifier') ?? 8;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new ModifierPF2e('PF2E.ProficiencyLevel4', modifier, MODIFIER_TYPE.PROFICIENCY);
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
                console.error(`PF2e System | Invalid proficiency rank: ${rank}`);
                return UNTRAINED.atLevel(level);
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
 * Represents the list of commonly applied modifiers for a specific creature statistic. Each
 * statistic or check can have multiple modifiers, even of the same type, but the stacking rules are
 * applied to ensure that only a single bonus and penalty of each type is applied to the total
 * modifier.
 * @category PF2
 */
export class StatisticModifier {
    /** The name of this collection of modifiers for a statistic. */
    name: string;
    /** The list of modifiers which affect the statistic. */
    protected _modifiers: ModifierPF2e[];
    /** The total modifier for the statistic, after applying stacking rules. */
    totalModifier!: number;
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

    /** Add a modifier to this collection. */
    push(modifier: ModifierPF2e) {
        // de-duplication
        if (this._modifiers.find((o) => o.name === modifier.name) === undefined) {
            this._modifiers.push(modifier);
            this.applyStackingRules();
        }
    }

    /** Delete a modifier from this collection by name. */
    delete(modifierName: string) {
        this._modifiers = this._modifiers.filter((m) => m.name !== modifierName);
        this.applyStackingRules();
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
        super(name, duplicate(statistic.modifiers).concat(modifiers));
    }
}

export interface RawPredicate {
    all?: string[];
    any?: string[];
    not?: string[];
    test?: (options?: string[]) => boolean;
}

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 * @category PF2
 */
export class ModifierPredicate implements RawPredicate {
    /** The options must have ALL of these entries for this predicate to pass.  */
    all: string[];
    /** The options must have AT LEAST ONE of these entries for this predicate to pass. */
    any: string[];
    /** The options must NOT HAVE ANY of these entries for this predicate to pass. */
    not: string[];

    /** Test if the given predicate passes for the given list of options. */
    static test(predicate: RawPredicate = {}, options: string[] = []): boolean {
        const { all, any, not } = predicate;

        let active = true;
        if (all && all.length > 0) {
            active = active && all.every((i) => options.includes(i));
        }
        if (any && any.length > 0) {
            active = active && any.some((i) => options.includes(i));
        }
        if (not && not.length > 0) {
            active = active && !not.some((i) => options.includes(i));
        }
        return active;
    }

    constructor(param: RawPredicate = { all: [], any: [], not: [] }) {
        this.all = param.all ?? [];
        this.any = param.any ?? [];
        this.not = param.not ?? [];
    }

    /** Test this predicate against a list of options, returning true if the predicate passes (and false otherwise). */
    test(options: string[] = []): boolean {
        return ModifierPredicate.test(this, options);
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
    critical: boolean;
    noCrit: boolean;
    /** The damage category of these dice. */
    category?: string;
    damageType?: string;
    traits: string[];
    /** If true, these dice overide the base damage dice of the weapon. */
    override?: DamageDiceOverride;
    ignored: boolean;
    enabled: boolean;
    custom: boolean;
    predicate: ModifierPredicate;

    constructor(param: Partial<DiceModifierPF2e> & { name: string }) {
        if (param.name) {
            this.name = param.name;
        } else {
            throw new Error('name is mandatory');
        }

        this.label = param.label;
        this.diceNumber = param.diceNumber ?? 0; // zero dice is allowed
        this.dieSize = param.dieSize;
        this.critical = param.critical ?? false;
        this.noCrit = param.noCrit ?? false;
        this.damageType = param.damageType;
        this.category = param.category;
        this.traits = param.traits ?? [];
        this.override = param.override;
        this.custom = param.custom ?? false;

        if (this.damageType) {
            this.category ??= DamageCategory.fromDamageType(this.damageType);
        }

        this.predicate = new ModifierPredicate(param?.predicate);
        this.ignored = ModifierPredicate.test!(this.predicate);
        this.enabled = this.ignored;
    }
}

type DamageDiceParameters = Partial<DamageDicePF2e> & Pick<DamageDicePF2e, 'selector' | 'name'>;

export class DamageDicePF2e extends DiceModifierPF2e {
    /** The selector used to determine when   */
    selector: string;

    constructor(params: DamageDiceParameters) {
        super(params);
        if (params.selector) {
            this.selector = params.selector;
        } else {
            throw new Error('selector is mandatory');
        }
    }
}
