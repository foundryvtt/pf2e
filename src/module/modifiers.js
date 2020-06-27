/* eslint-disable max-classes-per-file */

/**
 * @type {Readonly<{ITEM: string, STATUS: string, UNTYPED: string, ABILITY: string, CIRCUMSTANCE: string, PROFICIENCY: string}>}
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
 */
export class PF2Modifier {
  /**
   * @param {string} name
   * @param {number} modifier
   * @param {string} type
   * @param {boolean} enabled
   * @param {string} source
   * @param {string} notes
   */
  constructor(name, modifier, type, enabled = true, source = undefined, notes = undefined) {
    this.name = name;
    this.modifier = modifier;
    this.type = type;
    this.enabled = enabled;
    this.ignored = false;
    this.deleted = false;
    this.custom = false;
    if (source) this.source = source;
    if (notes) this.notes = notes;
  }

  disabled() {
    this.enabled = false;
    return this;
  }
}

// ability scores
export const STRENGTH = Object.freeze({
  withScore: (score) => new PF2Modifier('PF2E.AbilityStr', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const DEXTERITY = Object.freeze({
  withScore: (score) => new PF2Modifier('PF2E.AbilityDex', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const CONSTITUTION = Object.freeze({
  withScore: (score) => new PF2Modifier('PF2E.AbilityCon', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const INTELLIGENCE = Object.freeze({
  withScore: (score) => new PF2Modifier('PF2E.AbilityInt', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const WISDOM = Object.freeze({
  withScore: (score) => new PF2Modifier('PF2E.AbilityWis', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const CHARISMA = Object.freeze({
  withScore: (score) => new PF2Modifier('PF2E.AbilityCha', Math.floor((score - 10) / 2), PF2ModifierType.ABILITY),
});
export const AbilityModifier = Object.freeze({
  /**
   * @param {string} ability str = Strength, dex = Dexterity, con = Constitution, int = Intelligence, wis = Wisdom, cha = Charisma
   * @param {number} score
   * @returns {PF2Modifier}
   */
  fromAbilityScore: (ability, score) => {
    let modifier;
    switch (ability) {
      case 'str': modifier = STRENGTH.withScore(score); break;
      case 'dex': modifier = DEXTERITY.withScore(score); break;
      case 'con': modifier = CONSTITUTION.withScore(score); break;
      case 'int': modifier = INTELLIGENCE.withScore(score); break;
      case 'wis': modifier = WISDOM.withScore(score); break;
      case 'cha': modifier = CHARISMA.withScore(score); break;
      default:
        // Throwing an actual error can completely break the sheet. Instead, log
        // and use 0 for the modifier
        console.error(`invalid ability abbreviation: ${ability}`);
        modifier = new PF2Modifier('PF2E.AbilityUnknown', 0, PF2ModifierType.ABILITY);
    }
    return modifier;
  }
});

// proficiency ranks
export const UNTRAINED = Object.freeze({
  // eslint-disable-next-line no-unused-vars
  atLevel: (level) => {
    let modifier = game.settings.get('pf2e', 'proficiencyUntrainedModifer');
    return new PF2Modifier('PF2E.ProficiencyLevel0', modifier, PF2ModifierType.PROFICIENCY);
  },
  withoutLevel: () => {
    return UNTRAINED.atLevel(0);
  }
});
export const TRAINED = Object.freeze({
  atLevel: (level) => {
    let modifier = level + game.settings.get('pf2e', 'proficiencyTrainedModifer');
    return new PF2Modifier('PF2E.ProficiencyLevel1', modifier, PF2ModifierType.PROFICIENCY);
  },
  withoutLevel: () => {
    return TRAINED.atLevel(0);
  }
});
export const EXPERT = Object.freeze({
  atLevel: (level) => {
    let modifier = level + game.settings.get('pf2e', 'proficiencyExpertModifer');
    return new PF2Modifier('PF2E.ProficiencyLevel2', modifier, PF2ModifierType.PROFICIENCY);
  },
  withoutLevel: () => {
    return EXPERT.atLevel(0);
  }
});
export const MASTER = Object.freeze({
  atLevel: (level) => {
    let modifier = level + game.settings.get('pf2e', 'proficiencyMasterModifer');
    return new PF2Modifier('PF2E.ProficiencyLevel3', modifier, PF2ModifierType.PROFICIENCY);
  },
  withoutLevel: () => {
    return MASTER.atLevel(0);
  }
});
export const LEGENDARY = Object.freeze({
  atLevel: (level) => {
    let modifier = level + game.settings.get('pf2e', 'proficiencyLegendaryModifer');
    return new PF2Modifier('PF2E.ProficiencyLevel4', modifier, PF2ModifierType.PROFICIENCY);
  },
  withoutLevel: () => {
    return LEGENDARY.atLevel(0);
  }
});
export const ProficiencyModifier = Object.freeze({
  /**
   * @param {number} level
   * @param {number} rank 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
   * @returns {PF2Modifier}
   */
  fromLevelAndRank: (level, rank) => {
    const rule = game.settings.get('pf2e', 'proficiencyVariant');

    let modifier;
    switch (rank || 0) {
      case 0: modifier = (rule === 'ProficiencyWithoutLevel') ? UNTRAINED.withoutLevel() : UNTRAINED.atLevel(level); break;
      case 1: modifier = (rule === 'ProficiencyWithoutLevel') ? TRAINED.withoutLevel() : TRAINED.atLevel(level); break;
      case 2: modifier = (rule === 'ProficiencyWithoutLevel') ? EXPERT.withoutLevel() : EXPERT.atLevel(level); break;
      case 3: modifier = (rule === 'ProficiencyWithoutLevel') ? MASTER.withoutLevel() : MASTER.atLevel(level); break;
      case 4: modifier = (rule === 'ProficiencyWithoutLevel') ? LEGENDARY.withoutLevel() : LEGENDARY.atLevel(level); break;
      default: throw new RangeError(`invalid proficiency rank: ${rank}`);
    }
    return modifier;
  }
});

/**
 * @param {object} highestBonus
 * @param {PF2Modifier} modifier
 */
/* eslint-disable no-param-reassign */
function applyBonus(highestBonus, modifier) {
  let total = 0;
  const existing = highestBonus[modifier.type];
  if (existing && existing.type === modifier.type) {
    if (modifier.type === PF2ModifierType.UNTYPED) {
      modifier.enabled = true;
      total = modifier.modifier;
    } else if (existing.modifier >= modifier.modifier) {
      modifier.enabled = false;
    } else if (existing.modifier < modifier.modifier) {
      existing.enabled = false;
      modifier.enabled = true;
      highestBonus[modifier.type] = modifier;
      total = (modifier.modifier - existing.modifier); // calculate bonus difference
    }
  } else {
    modifier.enabled = true;
    highestBonus[modifier.type] = modifier;
    total = modifier.modifier;
  }
  return total;
}
/* eslint-enable */

/**
 * @param {object} lowestPenalty
 * @param {PF2Modifier} modifier
 */
/* eslint-disable no-param-reassign */
function applyPenalty(lowestPenalty, modifier) {
  let total = 0;
  const existing = lowestPenalty[modifier.type];
  if (modifier.type === PF2ModifierType.UNTYPED) {
    modifier.enabled = true;
    total = modifier.modifier;
  } else if (existing && existing.type === modifier.type) {
    if (existing.modifier <= modifier.modifier) {
      modifier.enabled = false;
    } else if (existing.modifier > modifier.modifier) {
      existing.enabled = false;
      modifier.enabled = true;
      lowestPenalty[modifier.type] = modifier;
      total = (modifier.modifier - existing.modifier); // calculate penalty difference
    }
  } else {
    modifier.enabled = true;
    lowestPenalty[modifier.type] = modifier;
    total = modifier.modifier;
  }
  return total;
}
/* eslint-enable */

/**
 * Applies the modifier stacking rules and calculates the total modifier.
 *
 * @param {PF2Modifier[]} modifiers
 * @returns {number}
 */
function applyStackingRules(modifiers) {
  let total = 0;
  const highestBonus = {};
  const lowestPenalty = {};
  for (let idx = modifiers.length - 1; idx >= 0; idx -= 1) {
    const modifier = modifiers[idx];
    if (modifier.deleted) {
      modifiers.splice(idx, 1); // remove any deleted modifiers
    } else if (modifier.ignored) {
      modifier.enabled = false;
    } else if (modifier.modifier < 0) {
      total += applyPenalty(lowestPenalty, modifier);
    } else {
      total += applyBonus(highestBonus, modifier);
    }
  }
  return total;
}

/**
 * Represents the list of commonly applied modifiers for a specific creature statistic. Each
 * statistic or check can have multiple modifiers, even of the same type, but the stacking rules are
 * applied to ensure that only a single bonus and penalty of each type is applied to the total
 * modifier.
 */
export class PF2StatisticModifier {
  /**
   * @param {string} name
   * @param {PF2Modifier[]} modifiers
   */
  constructor(name, modifiers) {
    this.name = name;
    this._modifiers = modifiers || [];
    { // de-duplication
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

  /**
   * @returns {PF2Modifier[]}
   */
  get modifiers() {
    const copy = [].concat(this._modifiers); // shallow copy to enable freezing
    return Object.freeze(copy);
  }

  /**
   * @param {PF2Modifier} modifier
   */
  push(modifier) {
    // de-duplication
    if (this._modifiers.find((o) => o.name === modifier.name) === undefined) {
      this._modifiers.push(modifier);
      this.applyStackingRules();
    }
  }

  /**
   * @param {string} modifierName
   */
  delete(modifierName) {
    this._modifiers.filter((m) => m.name === modifierName).forEach((m) => {m.deleted = true}); // eslint-disable-line no-param-reassign
    this.applyStackingRules();
  }

  applyStackingRules() {
    this.totalModifier = applyStackingRules(this._modifiers);
  }
}

/**
 * Represents the list of modifiers for a specific check.
 */
export class PF2CheckModifier extends PF2StatisticModifier {
  /**
   * @param {string} name
   * @param {PF2StatisticModifier} statistic
   * @param {PF2Modifier[]} modifiers
   */
  constructor(name, statistic, modifiers= []) {
    super(name, JSON.parse(JSON.stringify(statistic._modifiers)).concat(modifiers)); // deep clone
  }
}

/**
 * Encapsulates logic to determine if a modifier should be active or not for a specific roll based
 * on a list of string values. This will often be based on traits, but that is not required - sneak
 * attack could be an option that is not a trait.
 */
export class PF2ModifierPredicate {
  constructor(param) {
    this.all = param?.all ?? [];
    this.any = param?.any ?? [];
    this.not = param?.not ?? [];
  }

  test(options) {
    let active = true;
    if (this.all.length > 0) {
      active = active && this.all.every(i => options.includes(i));
    }
    if (this.any.length > 0) {
      active = active && this.any.some(i => options.includes(i));
    }
    if (this.not.length > 0) {
      active = active && !this.not.some(i => options.includes(i));
    }
    return active;
  }
}

/**
 * Represents extra damage dice for one or more weapons or attack actions.
 */
export class PF2DamageDice {

  /**
   * @param {object} param
   */
  constructor(param) {
    if (param.selector) { this.selector = param.selector; } else { throw new Error('selector is mandatory'); }
    if (param.name) { this.name = param.name } else { throw new Error('name is mandatory'); }
    this.diceNumber = param?.diceNumber ?? 0; // zero dice is allowed
    if (param.dieSize) {
      this.dieSize = param.dieSize; // default to base attack's damage die, if omitted
    }
    this.critical = param?.critical ?? false;
    this.category = param?.category;
    this.damageType = param?.damageType;
    this.traits = param?.traits ?? [];
    this.override = param?.override; // maybe restrict this object somewhat?
    this.predicate = param?.predicate ?? param?.options ?? {}; // options is the old name for this field
    if (!(this.predicate instanceof PF2ModifierPredicate)) {
      this.predicate =  new PF2ModifierPredicate(this.predicate);
    }
    this.ignored = this.predicate.test([]);
    this.enabled = this.ignored;
  }
}
