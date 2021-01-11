import { earnIncome } from '../../src/module/earn-income';
import { DegreeOfSuccess } from '../../src/module/degree-of-success';

const options = {
    useLoreAsExperiencedProfessional: false,
};

const dcOptions = {
    proficiencyWithoutLevel: false,
};

describe('earn income', () => {
    test('should earn a crit failure', () => {
        expect(earnIncome(1, 1, { dieValue: 1, modifier: 13 }, 'trained', options, dcOptions)).toEqual({
            rewards: { combined: {}, perDay: {} },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test('crit failures for using lores as an experienced professional should become a failure', () => {
        expect(
            earnIncome(
                1,
                1,
                {
                    dieValue: 1,
                    modifier: 13,
                },
                'expert',
                { useLoreAsExperiencedProfessional: true },
                dcOptions,
            ),
        ).toEqual({
            rewards: {
                combined: {
                    cp: 2,
                },
                perDay: {
                    cp: 2,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test('using lores as an experienced professional should earn double failure income', () => {
        expect(
            earnIncome(
                1,
                1,
                {
                    dieValue: 2,
                    modifier: 12,
                },
                'expert',
                { useLoreAsExperiencedProfessional: true },
                dcOptions,
            ),
        ).toEqual({
            rewards: {
                combined: {
                    cp: 4,
                },
                perDay: {
                    cp: 4,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test('should earn failure', () => {
        expect(earnIncome(1, 1, { dieValue: 13, modifier: 1 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                combined: {
                    cp: 2,
                },
                perDay: {
                    cp: 2,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test('should earn a success', () => {
        expect(earnIncome(1, 1, { dieValue: 13, modifier: 2 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                combined: {
                    sp: 2,
                },
                perDay: {
                    sp: 2,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            daysSpentWorking: 1,
            level: 1,
            roll: 15,
            dc: 15,
        });
    });

    test('should earn a success for 5 days', () => {
        expect(earnIncome(1, 5, { dieValue: 13, modifier: 2 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                combined: {
                    sp: 10,
                },
                perDay: {
                    sp: 2,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            daysSpentWorking: 5,
            level: 1,
            roll: 15,
            dc: 15,
        });
    });

    test('should earn a critical success', () => {
        expect(earnIncome(20, 1, { dieValue: 20, modifier: 20 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                combined: {
                    gp: 300,
                },
                perDay: {
                    gp: 300,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            daysSpentWorking: 1,
            level: 20,
            roll: 40,
            dc: 40,
        });
    });

    test('should earn a critical success with variant proficiency without level', () => {
        expect(
            earnIncome(
                20,
                1,
                {
                    dieValue: 20,
                    modifier: 0,
                },
                'legendary',
                options,
                { proficiencyWithoutLevel: true },
            ),
        ).toEqual({
            rewards: {
                combined: {
                    gp: 300,
                },
                perDay: {
                    gp: 300,
                },
            },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            daysSpentWorking: 1,
            level: 20,
            roll: 20,
            dc: 20,
        });
    });
});
