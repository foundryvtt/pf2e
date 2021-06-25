import each from 'jest-each';
import {
    STRENGTH,
    DEXTERITY,
    CONSTITUTION,
    INTELLIGENCE,
    WISDOM,
    CHARISMA,
    UNTRAINED,
    TRAINED,
    EXPERT,
    MASTER,
    LEGENDARY,
    AbilityModifier,
    ProficiencyModifier,
    MODIFIER_TYPE,
    ModifierPF2e,
    StatisticModifier,
    ModifierPredicate,
} from '@module/modifiers';

describe('#modifiers', () => {
    each([
        [STRENGTH.withScore(10), MODIFIER_TYPE.ABILITY],
        [DEXTERITY.withScore(10), MODIFIER_TYPE.ABILITY],
        [CONSTITUTION.withScore(10), MODIFIER_TYPE.ABILITY],
        [INTELLIGENCE.withScore(10), MODIFIER_TYPE.ABILITY],
        [WISDOM.withScore(10), MODIFIER_TYPE.ABILITY],
        [CHARISMA.withScore(10), MODIFIER_TYPE.ABILITY],
        [AbilityModifier.fromAbilityScore('str', 10), MODIFIER_TYPE.ABILITY],
        [AbilityModifier.fromAbilityScore('dex', 10), MODIFIER_TYPE.ABILITY],
        [AbilityModifier.fromAbilityScore('con', 10), MODIFIER_TYPE.ABILITY],
        [AbilityModifier.fromAbilityScore('int', 10), MODIFIER_TYPE.ABILITY],
        [AbilityModifier.fromAbilityScore('wis', 10), MODIFIER_TYPE.ABILITY],
        [AbilityModifier.fromAbilityScore('cha', 10), MODIFIER_TYPE.ABILITY],
        [UNTRAINED.atLevel(1), MODIFIER_TYPE.PROFICIENCY],
        [TRAINED.atLevel(1), MODIFIER_TYPE.PROFICIENCY],
        [EXPERT.atLevel(1), MODIFIER_TYPE.PROFICIENCY],
        [MASTER.atLevel(1), MODIFIER_TYPE.PROFICIENCY],
        [LEGENDARY.atLevel(1), MODIFIER_TYPE.PROFICIENCY],
    ]).test('ensure modifier %s has type %s', (modifier, expectedType) => {
        expect(modifier.type).toBe(expectedType);
    });

    describe('prevent invalid proficiency ranks', () => {
        beforeEach(() => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        test('prevent proficiency ranks below zero', () => {
            expect(ProficiencyModifier.fromLevelAndRank(1, -1).modifier).toEqual(UNTRAINED.atLevel(1).modifier);
        });

        test('prevent proficiency ranks above four', () => {
            expect(ProficiencyModifier.fromLevelAndRank(1, 5).modifier).toEqual(UNTRAINED.atLevel(1).modifier);
        });
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
            new ModifierPF2e('Status Bonus', 2, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Status Penalty', -1, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Item Bonus', 2, MODIFIER_TYPE.ITEM),
            new ModifierPF2e('Item Penalty', -1, MODIFIER_TYPE.ITEM),
            new ModifierPF2e('Circumstance Bonus', 2, MODIFIER_TYPE.CIRCUMSTANCE),
            new ModifierPF2e('Circumstance Penalty', -1, MODIFIER_TYPE.CIRCUMSTANCE),
            new ModifierPF2e('Untyped Penalty', -1, MODIFIER_TYPE.UNTYPED),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.totalModifier).toBe(9);
    });

    test('enable only highest bonus when stacking applied for overlapping modifiers', () => {
        const modifiers = [
            new ModifierPF2e('Status Bonus 1', 1, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Status Bonus 2', 2, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Status Bonus 3', 3, MODIFIER_TYPE.STATUS),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.totalModifier).toBe(3);
    });

    test('enable only last bonus of a type when stacking applied for overlapping and equal modifiers', () => {
        const modifiers = [
            new ModifierPF2e('First Status Bonus', 2, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Second Status Bonus', 2, MODIFIER_TYPE.STATUS),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.totalModifier).toBe(2);
        expect(modifiers[0].enabled).toBe(false);
        expect(modifiers[1].enabled).toBe(true);
    });

    test('enable only lowest penalty when stacking applied for overlapping modifiers', () => {
        const modifiers = [
            new ModifierPF2e('Status Penalty -1', -1, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Status Penalty -2', -2, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Status Penalty -3', -3, MODIFIER_TYPE.STATUS),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.totalModifier).toBe(-3);
    });

    test('enable only last penalty of a type when stacking applied for overlapping and equal modifiers', () => {
        const modifiers = [
            new ModifierPF2e('First Status Penalty', -2, MODIFIER_TYPE.STATUS),
            new ModifierPF2e('Second Status Penalty', -2, MODIFIER_TYPE.STATUS),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.totalModifier).toBe(-2);
        expect(modifiers[0].enabled).toBe(false);
        expect(modifiers[1].enabled).toBe(true);
    });

    test('ensure untyped penalties always are enabled and stacks', () => {
        const modifiers = [
            new ModifierPF2e('First Untyped Penalty', -2, MODIFIER_TYPE.UNTYPED),
            new ModifierPF2e('Second Untyped Penalty', -2, MODIFIER_TYPE.UNTYPED),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.totalModifier).toBe(-4);
    });

    test('ensure deduplication of similarly named modifiers', () => {
        const modifiers = [
            new ModifierPF2e('Test Bonus', 2, MODIFIER_TYPE.ABILITY),
            new ModifierPF2e('Test Bonus', 2, MODIFIER_TYPE.PROFICIENCY),
        ];
        const stat = new StatisticModifier('Test Stat', modifiers);
        expect(stat.modifiers.length).toBe(1);
    });

    test('ensure modifier predicate without criteria activates with empty options list', () => {
        const predicate = new ModifierPredicate({});
        expect(predicate.test([])).toBe(true);
    });

    test('ensure modifier predicate with all criterium activates with single options list', () => {
        const predicate = new ModifierPredicate({ all: ['dummy1'] });
        expect(predicate.test(['dummy0', 'dummy1', 'dummy2'])).toBe(true);
    });

    test('ensure modifier predicate with all criterium activates with multiple options list', () => {
        const predicate = new ModifierPredicate({ all: ['dummy0', 'dummy1', 'dummy2'] });
        expect(predicate.test(['dummy0', 'dummy1', 'dummy2'])).toBe(true);
    });

    test('ensure modifier predicate with all criterium deactivates with non-matching options list', () => {
        const predicate = new ModifierPredicate({ all: ['dummy0', 'dummy1', 'dummy2'] });
        expect(predicate.test(['dummy1', 'dummy2', 'dummy3'])).toBe(false);
    });

    test('ensure modifier predicate with any criterium activates with single options list', () => {
        const predicate = new ModifierPredicate({ any: ['dummy1'] });
        expect(predicate.test(['dummy0', 'dummy1', 'dummy2'])).toBe(true);
    });

    test('ensure modifier predicate with any criterium activates with multiple options list', () => {
        const predicate = new ModifierPredicate({ any: ['dummy0', 'dummy1', 'dummy2'] });
        expect(predicate.test(['dummy1', 'dummy2', 'dummy3'])).toBe(true);
    });

    test('ensure modifier predicate with any criterium deactivates with non-matching options list', () => {
        const predicate = new ModifierPredicate({ any: ['dummy0', 'dummy1', 'dummy2'] });
        expect(predicate.test(['dummy3', 'dummy4', 'dummy5'])).toBe(false);
    });

    test('ensure modifier predicate with not criterium activates with non-matching options list', () => {
        const predicate = new ModifierPredicate({ not: ['dummy0', 'dummy1', 'dummy2'] });
        expect(predicate.test(['dummy3', 'dummy4', 'dummy5'])).toBe(true);
    });

    test('ensure modifier predicate with not criterium deactivates with overlapping options list', () => {
        const predicate = new ModifierPredicate({ not: ['dummy0', 'dummy1', 'dummy2'] });
        expect(predicate.test(['dummy2', 'dummy3', 'dummy4'])).toBe(false);
    });
});
