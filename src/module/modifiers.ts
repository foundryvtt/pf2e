import { DamageDieSize } from './system/damage/damage';
import { AbilityString } from '@actor/actorDataDefinitions';

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
export const PF2ModifierType = Object.freeze({
    /**
     * Nearly all checks allow you to add an ability modifier to the roll. An ability modifier
     * represents your raw capabilities and is derived from an ability score. Exactly which ability
     * modifier you use is determined by what you're trying to accomplish. Usually a sword swing
     * applies your Strength modifier, whereas remembering the name of the earl's cousin uses your
     * Intelligence modifier.
     */
    ABILITY: 'ability',
    /**
     * When attempting a check that involves something you have some training in, you will also add
     * your proficiency bonus. This bonus depends on your proficiency rank: untrained, trained,
     * expert, master, or legendary. If you're untrained, your bonus is +0 — you must rely on raw
     * talent and any bonuses from the situation. Otherwise, the bonus equals your character's level
     * plus a certain amount depending on your rank. If your proficiency rank is trained, this bonus
     * is equal to your level + 2, and higher proficiency ranks further increase the amount you add to
     * your level.
     */
    PROFICIENCY: 'proficiency',
    /**
     * Circumstance bonuses typically involve the situation you find yourself in when attempting a
     * check. For instance, using Raise a Shield with a buckler grants you a +1 circumstance bonus to
     * AC. Being behind cover grants you a +2 circumstance bonus to AC. If you are both behind cover
     * and Raising a Shield, you gain only the +2 circumstance bonus for cover, since they're the same
     * type and the bonus from cover is higher.
     */
    CIRCUMSTANCE: 'circumstance',
    /**
     * Item bonuses are granted by some item that you are wearing or using, either mundane or magical.
     * For example, armor gives you an item bonus to AC, while expanded alchemist's tools grant you an
     * item bonus to Crafting checks when making alchemical items.
     */
    ITEM: 'item',
    /**
     * Status bonuses typically come from spells, other magical effects, or something applying a
     * helpful, often temporary, condition to you. For instance, the 3rd-level heroism spell grants a
     * +1 status bonus to attack rolls, Perception checks, saving throws, and skill checks. If you
     * were under the effect of heroism and someone cast the bless spell, which also grants a +1
     * status bonus on attacks, your attack rolls would gain only a +1 status bonus, since both spells
     * grant a +1 status bonus to those rolls, and you only take the highest status bonus.
     */
    STATUS: 'status',
    /**
     * Unlike bonuses, penalties can also be untyped, in which case they won’t be classified as
     * "circumstance", "item", or "status". Unlike other penalties, you always add all your untyped
     * penalties together rather than simply taking the worst one. For instance, when you use attack
     * actions, you incur a multiple attack penalty on each attack you make on your turn after the
     * first attack, and when you attack a target that's beyond your weapon's normal range increment,
     * you incur a range penalty on the attack. Because these are both untyped penalties, if you make
     * multiple attacks at a faraway target, you'd apply both the multiple attack penalty and the
     * range penalty to your roll.
     */
    UNTYPED: 'untyped',
});

/**
 * Represents a discrete modifier, either bonus or penalty, to a statistic or check.
 * @category PF2
 */
export class PF2Modifier {
    /** The name of this modifier; should generally be a localization key (see en.json). */
    name: string;
    /** The display name of this modifier, overriding the name field if specific; can be a localization key (see en.json). */
    label?: string;
    /** The actual numeric benefit/penalty that this modifier provides. */
    modifier: number;
    /** The type of this modifier - modifiers of the same type do not stack (except for `untyped` modifiers). */
    type: string;
    /** If true, this modifier will be applied to the final roll; if false, it will be ignored. */
    enabled: boolean;
    /** The source which this modifier originates from, if any. */
    source: string;
    /** Any notes about this modifier. */
    notes: string;
    /** If true, this modifier should be explicitly ignored in calculation; it is usually set by user action. */
    ignored: boolean;
    /** If true, this modifier is a custom player-provided modifier. */
    custom: boolean;
    /** The damage type that this modifier does, if it modifies a damage roll. */
    damageType: string;
    /** The damage category */
    damageCategory: string;
    /** A predicate which determines when this modifier is active. */
    predicate: any;
    /** If true, this modifier is only active on a critical hit. */
    critical: boolean;
    /** The list of traits that this modifier gives to the underlying attack, if any. */
    traits?: string[];

    /**
     * Create a new modifier.
     * @param {string} name The name for the modifier; should generally be a localization key.
     * @param {number} modifier The actual numeric benefit/penalty that this modifier provides.
     * @param {string} type The type of the modifier - modifiers of the same type do not stack (except for `untyped` modifiers).
     * @param {boolean} enabled If true, this modifier will be applied to the result; otherwise, it will not.
     * @param {string} source The source which this modifier originates from, if any.
     * @param {string} notes Any notes about this modifier.
     */
    constructor(
        name: string,
        modifier: number,
        type: string,
        enabled: boolean = true,
        source: string | undefined = undefined,
        notes: string | undefined = undefined,
    ) {
        this.name = name;
        this.modifier = modifier;
        this.type = type;
        this.enabled = enabled;
        this.ignored = false;
        this.custom = false;
        if (source) this.source = source;
        if (notes) this.notes = notes;
    }
}

// ability scores
export const STRENGTH = Object.freeze({
    withScore: (score: number) =>
        new PF2Modifier('PF2E.AbilityStr', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const DEXTERITY = Object.freeze({
    withScore: (score: number) =>
        new PF2Modifier('PF2E.AbilityDex', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const CONSTITUTION = Object.freeze({
    withScore: (score: number) =>
        new PF2Modifier('PF2E.AbilityCon', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const INTELLIGENCE = Object.freeze({
    withScore: (score: number) =>
        new PF2Modifier('PF2E.AbilityInt', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const WISDOM = Object.freeze({
    withScore: (score: number) =>
        new PF2Modifier('PF2E.AbilityWis', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const CHARISMA = Object.freeze({
    withScore: (score: number) =>
        new PF2Modifier('PF2E.AbilityCha', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const AbilityModifier = Object.freeze({
    /**
     * Create a modifier from a given ability type and score.
     * @param {AbilityString} ability str = Strength, dex = Dexterity, con = Constitution, int = Intelligence, wis = Wisdom, cha = Charisma
     * @param {number} score The score of this ability.
     * @returns {PF2Modifier} The modifier provided by the given ability score.
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
                return new PF2Modifier('PF2E.AbilityUnknown', 0, PF2ModifierType.ABILITY);
        }
    },
});

// proficiency ranks
export const UNTRAINED = Object.freeze({
    atLevel: (_level: number) => {
        const modifier = game.settings.get('pf2e', 'proficiencyUntrainedModifier') ?? 0;
        return new PF2Modifier('PF2E.ProficiencyLevel0', modifier, PF2ModifierType.PROFICIENCY);
    },
});
export const TRAINED = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyTrainedModifier') ?? 2;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new PF2Modifier('PF2E.ProficiencyLevel1', modifier, PF2ModifierType.PROFICIENCY);
    },
});
export const EXPERT = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyExpertModifier') ?? 4;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new PF2Modifier('PF2E.ProficiencyLevel2', modifier, PF2ModifierType.PROFICIENCY);
    },
});
export const MASTER = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyMasterModifier') ?? 6;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new PF2Modifier('PF2E.ProficiencyLevel3', modifier, PF2ModifierType.PROFICIENCY);
    },
});
export const LEGENDARY = Object.freeze({
    atLevel: (level: number) => {
        const rule = game.settings.get('pf2e', 'proficiencyVariant') ?? 'ProficiencyWithLevel';
        let modifier = game.settings.get('pf2e', 'proficiencyLegendaryModifier') ?? 8;
        if (rule === 'ProficiencyWithLevel') {
            modifier += level;
        }
        return new PF2Modifier('PF2E.ProficiencyLevel4', modifier, PF2ModifierType.PROFICIENCY);
    },
});
export const ProficiencyModifier = Object.freeze({
    /**
     * Create a modifier for a given proficiency level of some ability.
     * @param {number} level The level of the character which this modifier is being applied to.
     * @param {number} rank 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
     * @returns {PF2Modifier} The modifier for the given proficiency rank and character level.
     */
    fromLevelAndRank: (level: number, rank: number) => {
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
                throw new RangeError(`invalid proficiency rank: ${rank}`);
        }
    },
});

/** A comparison which rates the first modifier as better than the second if it's modifier is at least as large. */
const HIGHER_BONUS = (a: PF2Modifier, b: PF2Modifier) => a.modifier >= b.modifier;
/** A comparison which rates the first modifier as better than the second if it's modifier is at least as small. */
const LOWER_PENALTY = (a: PF2Modifier, b: PF2Modifier) => a.modifier <= b.modifier;

/**
 * Given a current map of damage type -> best modifier, compare the given modifier against the current best modifier
 * and update it if it is better (according to the `isBetter` comparison function). Returns the delta in the total modifier
 * as a result of this update.
 */
function applyStacking(
    best: Record<string, PF2Modifier>,
    modifier: PF2Modifier,
    isBetter: (first: PF2Modifier, second: PF2Modifier) => boolean,
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
 * @param {PF2Modifier[]} modifiers The list of modifiers to apply stacking rules for.
 * @returns {number} The total modifier provided by the given list of modifiers.
 */
function applyStackingRules(modifiers: PF2Modifier[]): number {
    let total = 0;
    const highestBonus: Record<string, PF2Modifier> = {};
    const lowestPenalty: Record<string, PF2Modifier> = {};

    for (const modifier of modifiers) {
        // Always disable ignored modifiers and don't do anything further with them.
        if (modifier.ignored) {
            modifier.enabled = false;
            continue;
        }

        // Untyped modifiers always stack, so enable them and add their modifier.
        if (modifier.type === PF2ModifierType.UNTYPED) {
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
export class PF2StatisticModifier {
    /** The name of this collection of modifiers for a statistic. */
    name: string;
    /** The list of modifiers which affect the statistic. */
    _modifiers: PF2Modifier[];
    /** The total modifier for the statistic, after applying stacking rules. */
    totalModifier: number;
    /** Allow decorating this object with any needed extra fields. */
    [key: string]: any;

    /**
     * @param {string} name The name of this collection of statistic modifiers.
     * @param {PF2Modifier[]} modifiers All relevant modifiers for this statistic.
     */
    constructor(name: string, modifiers: PF2Modifier[]) {
        this.name = name;
        this._modifiers = modifiers || [];
        {
            // de-duplication
            const seen = [];
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
    get modifiers(): readonly PF2Modifier[] {
        return Object.freeze([].concat(this._modifiers));
    }

    /** Add a modifier to this collection. */
    push(modifier: PF2Modifier) {
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
export class PF2CheckModifier extends PF2StatisticModifier {
    /**
     * @param {string} name The name of this check modifier.
     * @param {PF2StatisticModifier} statistic The statistic modifier to copy fields from.
     * @param {PF2Modifier[]} modifiers Additional modifiers to add to this check.
     */
    constructor(name: string, statistic: PF2StatisticModifier, modifiers: PF2Modifier[] = []) {
        super(name, JSON.parse(JSON.stringify(statistic._modifiers)).concat(modifiers)); // deep clone
    }
}

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 * @category PF2
 */
export class PF2ModifierPredicate {
    /** The options must have ALL of these entries for this predicate to pass.  */
    all: string[];
    /** The options must have AT LEAST ONE of these entries for this predicate to pass. */
    any: string[];
    /** The options must NOT HAVE ANY of these entries for this predicate to pass. */
    not: string[];

    /** Test if the given predicate passes for the given list of options. */
    static test(predicate: { all?: string[]; any?: string[]; not?: string[] }, options: string[]): boolean {
        const { all, any, not } = predicate ?? {};

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

    constructor(param?: { all?: string[]; any?: string[]; not?: string[] }) {
        this.all = param?.all ?? [];
        this.any = param?.any ?? [];
        this.not = param?.not ?? [];
    }

    /** Test this predicate against a list of options, returning true if the predicate passes (and false otherwise). */
    test(options: string[]): boolean {
        return PF2ModifierPredicate.test(this, options);
    }
}

/**
 * Represents extra damage dice for one or more weapons or attack actions.
 * @category PF2
 */
export class PF2DamageDice {
    /** The selector used to determine when   */
    selector: string;
    /** The name of this damage dice; used as an identifier. */
    name: string;
    /** The display name of this damage dice, overriding the name field if specified. */
    label?: string;
    /** The number of dice to add. */
    diceNumber: number;
    /** The size of the dice to add. */
    dieSize: DamageDieSize;
    /** If true, these dice only apply on a critical. */
    critical: boolean;
    /** The damage category of these dice. */
    category?: string;
    /** The damage type of these damage dice. */
    damageType?: string;
    /** Any traits which these dice add to the overall damage. */
    traits: string[];
    /** If true, these dice overide the base damage dice of the weapon. */
    override?: boolean;
    /** If true, these custom dice are being ignored in the damage calculation. */
    ignored: boolean;
    /** If true, these custom dice should be considered in the damage calculation. */
    enabled: boolean;
    /** If true, these dice are user-provided/custom. */
    custom: boolean;
    /** A predicate which limits when this damage dice is actually applied. */
    predicate?: PF2ModifierPredicate;

    constructor(param: Partial<PF2DamageDice> & { options?: object }) {
        if (param.selector) {
            this.selector = param.selector;
        } else {
            throw new Error('selector is mandatory');
        }
        if (param.name) {
            this.name = param.name;
        } else {
            throw new Error('name is mandatory');
        }
        this.label = param?.label;
        this.diceNumber = param?.diceNumber ?? 0; // zero dice is allowed
        this.dieSize = param?.dieSize;
        this.critical = param?.critical ?? false;
        this.category = param?.category;
        this.damageType = param?.damageType;
        this.traits = param?.traits ?? [];
        this.override = param?.override; // maybe restrict this object somewhat?
        this.predicate = new PF2ModifierPredicate(param?.predicate ?? param?.options ?? {}); // options is the old name for this field
        this.ignored = PF2ModifierPredicate.test(this.predicate, []);
        this.enabled = this.ignored;
        this.custom = param?.custom;
    }
}
