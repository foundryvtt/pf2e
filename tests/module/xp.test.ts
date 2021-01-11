import { calculateXP } from '../../src/module/xp';

const dcOptions = {
    proficiencyWithoutLevel: false,
};

describe('should calculate xp', () => {
    test('party of 4', () => {
        const result = calculateXP(
            4,
            4,
            [2, 2, 2],
            [
                { level: 2, isComplex: true },
                {
                    level: 4,
                    isComplex: false,
                },
            ],
            dcOptions,
        );

        expect(result).toEqual({
            encounterBudgets: {
                trivial: 40,
                low: 60,
                moderate: 80,
                severe: 120,
                extreme: 160,
            },
            rating: 'moderate',
            xpPerPlayer: 88,
            totalXP: 88,
            partySize: 4,
            partyLevel: 4,
        });
    });

    test('party of 5', () => {
        const result = calculateXP(
            4,
            5,
            [2, 2, 2],
            [
                { level: 2, isComplex: true },
                {
                    level: 4,
                    isComplex: false,
                },
            ],
            dcOptions,
        );

        expect(result).toEqual({
            encounterBudgets: {
                trivial: 50,
                low: 75,
                moderate: 100,
                severe: 150,
                extreme: 200,
            },
            rating: 'low',
            xpPerPlayer: 70,
            totalXP: 88,
            partySize: 5,
            partyLevel: 4,
        });
    });
});