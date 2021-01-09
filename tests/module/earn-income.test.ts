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
        expect(earnIncome(1, { dieValue: 1, modifier: 13 }, 'trained', options, dcOptions)).toEqual({
            rewards: {},
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
        });
    });

    test('crit failures for using lores as an experienced professional should become a failure', () => {
        expect(
            earnIncome(
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
                cp: 2,
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
        });
    });

    test('using lores as an experienced professional should earn double failure income', () => {
        expect(
            earnIncome(
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
                cp: 4,
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
        });
    });

    test('should earn failure', () => {
        expect(earnIncome(1, { dieValue: 13, modifier: 1 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                cp: 2,
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
        });
    });

    test('should earn a success', () => {
        expect(earnIncome(1, { dieValue: 13, modifier: 2 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                sp: 2,
            },
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
        });
    });

    test('should earn a critical success', () => {
        expect(earnIncome(20, { dieValue: 20, modifier: 20 }, 'legendary', options, dcOptions)).toEqual({
            rewards: {
                gp: 300,
            },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
        });
    });

    test('should earn a critical success with variant proficiency without level', () => {
        expect(
            earnIncome(
                20,
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
                gp: 300,
            },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
        });
    });
});
