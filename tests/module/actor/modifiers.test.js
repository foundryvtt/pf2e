import each from 'jest-each';
import {
  STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE, WISDOM, CHARISMA,
  UNTRAINED, TRAINED, EXPERT, MASTER, LEGENDARY,
  AbilityModifier, ProficiencyModifier, PF2ModifierType, PF2Modifier, PF2StatisticModifier,
} from 'module/modifiers.js';

describe('#modifiers', () => {
  each([
    [STRENGTH.withScore(10), PF2ModifierType.ABILITY],
    [DEXTERITY.withScore(10), PF2ModifierType.ABILITY],
    [CONSTITUTION.withScore(10), PF2ModifierType.ABILITY],
    [INTELLIGENCE.withScore(10), PF2ModifierType.ABILITY],
    [WISDOM.withScore(10), PF2ModifierType.ABILITY],
    [CHARISMA.withScore(10), PF2ModifierType.ABILITY],
    [AbilityModifier.fromAbilityScore('str', 10), PF2ModifierType.ABILITY],
    [AbilityModifier.fromAbilityScore('dex', 10), PF2ModifierType.ABILITY],
    [AbilityModifier.fromAbilityScore('con', 10), PF2ModifierType.ABILITY],
    [AbilityModifier.fromAbilityScore('int', 10), PF2ModifierType.ABILITY],
    [AbilityModifier.fromAbilityScore('wis', 10), PF2ModifierType.ABILITY],
    [AbilityModifier.fromAbilityScore('cha', 10), PF2ModifierType.ABILITY],
    [UNTRAINED.atLevel(1), PF2ModifierType.PROFICIENCY],
    [TRAINED.atLevel(1), PF2ModifierType.PROFICIENCY],
    [EXPERT.atLevel(1), PF2ModifierType.PROFICIENCY],
    [MASTER.atLevel(1), PF2ModifierType.PROFICIENCY],
    [LEGENDARY.atLevel(1), PF2ModifierType.PROFICIENCY],
  ]).test('ensure modifier %s has type %s', (modifier, expectedType) => {
    expect(modifier.type).toBe(expectedType);
  });

  test('prevent proficiency ranks below zero', () => {
    expect(() => ProficiencyModifier.fromLevelAndRank(1, -1)).toThrow(RangeError);
  });

  test('prevent proficiency ranks above four', () => {
    expect(() => ProficiencyModifier.fromLevelAndRank(1, 5)).toThrow(RangeError);
  });

  each([
    [2, 0, UNTRAINED.atLevel(2).modifier],
    [2, 1, TRAINED.atLevel(2).modifier],
    [2, 2, EXPERT.atLevel(2).modifier],
    [2, 3, MASTER.atLevel(2).modifier],
    [2, 4, LEGENDARY.atLevel(2).modifier],
  ]).test('ensure level %d and rank 0 modifier matches modifier of %d', (level, rank, expectedModifier) => {
    expect(ProficiencyModifier.fromLevelAndRank(level, rank).modifier).toBe(expectedModifier);
  });

  each([
    [STRENGTH.withScore(9), -1],
    [STRENGTH.withScore(10), 0],
    [STRENGTH.withScore(11), 0],
    [STRENGTH.withScore(12), 1],
    [STRENGTH.withScore(13), 1],
    [STRENGTH.withScore(14), 2],
    [STRENGTH.withScore(15), 2],
    [DEXTERITY.withScore(9), -1],
    [DEXTERITY.withScore(10), 0],
    [DEXTERITY.withScore(11), 0],
    [DEXTERITY.withScore(12), 1],
    [DEXTERITY.withScore(13), 1],
    [DEXTERITY.withScore(14), 2],
    [DEXTERITY.withScore(15), 2],
    [CONSTITUTION.withScore(9), -1],
    [CONSTITUTION.withScore(10), 0],
    [CONSTITUTION.withScore(11), 0],
    [CONSTITUTION.withScore(12), 1],
    [CONSTITUTION.withScore(13), 1],
    [CONSTITUTION.withScore(14), 2],
    [CONSTITUTION.withScore(15), 2],
    [INTELLIGENCE.withScore(9), -1],
    [INTELLIGENCE.withScore(10), 0],
    [INTELLIGENCE.withScore(11), 0],
    [INTELLIGENCE.withScore(12), 1],
    [INTELLIGENCE.withScore(13), 1],
    [INTELLIGENCE.withScore(14), 2],
    [INTELLIGENCE.withScore(15), 2],
    [WISDOM.withScore(9), -1],
    [WISDOM.withScore(10), 0],
    [WISDOM.withScore(11), 0],
    [WISDOM.withScore(12), 1],
    [WISDOM.withScore(13), 1],
    [WISDOM.withScore(14), 2],
    [WISDOM.withScore(15), 2],
    [CHARISMA.withScore(9), -1],
    [CHARISMA.withScore(10), 0],
    [CHARISMA.withScore(11), 0],
    [CHARISMA.withScore(12), 1],
    [CHARISMA.withScore(13), 1],
    [CHARISMA.withScore(14), 2],
    [CHARISMA.withScore(15), 2],
    [AbilityModifier.fromAbilityScore('str', 9), -1],
    [AbilityModifier.fromAbilityScore('dex', 10), 0],
    [AbilityModifier.fromAbilityScore('con', 11), 0],
    [AbilityModifier.fromAbilityScore('int', 12), 1],
    [AbilityModifier.fromAbilityScore('wis', 13), 1],
    [AbilityModifier.fromAbilityScore('cha', 14), 2],
  ]).test('ensure ability modifier %s rounds correctly to %d', (modifier, expected) => {
    expect(modifier.modifier).toBe(expected);
  });

  test('enable all modifiers when stacking applied for non-overlapping modifiers', () => {
    const modifiers = [
      DEXTERITY.withScore(14),
      TRAINED.atLevel(3),
      new PF2Modifier('Status Bonus', 2, PF2ModifierType.STATUS),
      new PF2Modifier('Status Penalty', -1, PF2ModifierType.STATUS),
      new PF2Modifier('Item Bonus', 2, PF2ModifierType.ITEM),
      new PF2Modifier('Item Penalty', -1, PF2ModifierType.ITEM),
      new PF2Modifier('Circumstance Bonus', 2, PF2ModifierType.CIRCUMSTANCE),
      new PF2Modifier('Circumstance Penalty', -1, PF2ModifierType.CIRCUMSTANCE),
      new PF2Modifier('Untyped Penalty', -1, PF2ModifierType.UNTYPED),
    ];
    modifiers.forEach((modifier) => modifier.disabled());
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.totalModifier).toBe(9);
  });

  test('enable only highest bonus when stacking applied for overlapping modifiers', () => {
    const modifiers = [
      new PF2Modifier('Status Bonus 1', 1, PF2ModifierType.STATUS),
      new PF2Modifier('Status Bonus 2', 2, PF2ModifierType.STATUS),
      new PF2Modifier('Status Bonus 3', 3, PF2ModifierType.STATUS),
    ];
    modifiers.forEach((modifier) => modifier.disabled());
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.totalModifier).toBe(3);
  });

  test('enable only last bonus of a type when stacking applied for overlapping and equal modifiers', () => {
    const modifiers = [
      new PF2Modifier('First Status Bonus', 2, PF2ModifierType.STATUS),
      new PF2Modifier('Second Status Bonus', 2, PF2ModifierType.STATUS),
    ];
    modifiers.forEach((modifier) => modifier.disabled());
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.totalModifier).toBe(2);
    expect(modifiers[0].enabled).toBe(false);
    expect(modifiers[1].enabled).toBe(true);
  });

  test('enable only lowest penalty when stacking applied for overlapping modifiers', () => {
    const modifiers = [
      new PF2Modifier('Status Penalty -1', -1, PF2ModifierType.STATUS),
      new PF2Modifier('Status Penalty -2', -2, PF2ModifierType.STATUS),
      new PF2Modifier('Status Penalty -3', -3, PF2ModifierType.STATUS),
    ];
    modifiers.forEach((modifier) => modifier.disabled());
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.totalModifier).toBe(-3);
  });

  test('enable only last penalty of a type when stacking applied for overlapping and equal modifiers', () => {
    const modifiers = [
      new PF2Modifier('First Status Penalty', -2, PF2ModifierType.STATUS),
      new PF2Modifier('Second Status Penalty', -2, PF2ModifierType.STATUS),
    ];
    modifiers.forEach((modifier) => modifier.disabled());
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.totalModifier).toBe(-2);
    expect(modifiers[0].enabled).toBe(false);
    expect(modifiers[1].enabled).toBe(true);
  });

  test('ensure untyped penalties always are enabled and stacks', () => {
    const modifiers = [
      new PF2Modifier('First Untyped Penalty', -2, PF2ModifierType.UNTYPED),
      new PF2Modifier('Second Untyped Penalty', -2, PF2ModifierType.UNTYPED),
    ];
    modifiers.forEach((modifier) => modifier.disabled());
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.totalModifier).toBe(-4);
  });

  test('ensure deduplication of similarly named modifiers', () => {
    const modifiers = [
      new PF2Modifier('Test Bonus', 2, PF2ModifierType.ABILITY),
      new PF2Modifier('Test Bonus', 2, PF2ModifierType.PROFICIENCY),
    ];
    const stat = new PF2StatisticModifier('Test Stat', modifiers);
    expect(stat.modifiers.length).toBe(1);
  });
});
