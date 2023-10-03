import { calculateDC, earnIncome } from "@scripts/macros/earn-income/calculate.ts";
import { DegreeOfSuccess } from "@system/degree-of-success.ts";

const options = {
    useLoreAsExperiencedProfessional: false,
};

const dcOptions = {
    proficiencyWithoutLevel: false,
};

describe("earn income", () => {
    test("should earn a crit failure", () => {
        const level = 1;
        const dc = calculateDC(level, dcOptions);
        expect(
            earnIncome({
                level,
                days: 1,
                rollBrief: { dieValue: 1, modifier: 13 },
                proficiency: 1,
                options,
                dc,
            })
        ).toMatchObject({
            rewards: { combined: {}, perDay: {} },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test("crit failures for using lores as an experienced professional should become a failure", () => {
        const level = 1;
        const dc = calculateDC(level, dcOptions);

        expect(
            earnIncome({
                level,
                days: 1,
                rollBrief: { dieValue: 1, modifier: 13 },
                proficiency: 2,
                options: { useLoreAsExperiencedProfessional: true },
                dc,
            })
        ).toMatchObject({
            rewards: {
                combined: { cp: 2 },
                perDay: { cp: 2 },
            },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test("using lores as an experienced professional should earn double failure income", () => {
        const level = 1;
        const dc = calculateDC(level, dcOptions);

        expect(
            earnIncome({
                level,
                days: 1,
                rollBrief: { dieValue: 2, modifier: 12 },
                proficiency: 2,
                options: { useLoreAsExperiencedProfessional: true },
                dc,
            })
        ).toMatchObject({
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

    test("should earn failure", () => {
        const level = 1;
        const dc = calculateDC(level, dcOptions);

        expect(
            earnIncome({
                level,
                days: 1,
                rollBrief: { dieValue: 13, modifier: 1 },
                proficiency: 4,
                options,
                dc,
            })
        ).toMatchObject({
            rewards: { combined: { cp: 2 }, perDay: { cp: 2 } },
            degreeOfSuccess: DegreeOfSuccess.FAILURE,
            daysSpentWorking: 1,
            level: 1,
            roll: 14,
            dc: 15,
        });
    });

    test("should earn a success", () => {
        const level = 1;
        const dc = calculateDC(level, dcOptions);
        expect(
            earnIncome({
                level,
                days: 1,
                rollBrief: { dieValue: 13, modifier: 2 },
                proficiency: 4,
                options,
                dc,
            })
        ).toMatchObject({
            rewards: {
                combined: { sp: 2 },
                perDay: { sp: 2 },
            },
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            daysSpentWorking: 1,
            level: 1,
            roll: 15,
            dc: 15,
        });
    });

    test("should earn a success for 5 days", () => {
        const level = 1;
        const dc = calculateDC(level, dcOptions);
        expect(
            earnIncome({
                level,
                days: 5,
                rollBrief: { dieValue: 13, modifier: 2 },
                proficiency: 4,
                options,
                dc,
            })
        ).toMatchObject({
            rewards: {
                combined: { sp: 10 },
                perDay: { sp: 2 },
            },
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            daysSpentWorking: 5,
            level: 1,
            roll: 15,
            dc: 15,
        });
    });

    test("should earn a critical success", () => {
        const level = 20;
        const dc = calculateDC(level, dcOptions);
        expect(
            earnIncome({
                level,
                days: 1,
                rollBrief: { dieValue: 20, modifier: 20 },
                proficiency: 4,
                options,
                dc,
            })
        ).toMatchObject({
            rewards: {
                combined: { gp: 300 },
                perDay: { gp: 300 },
            },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            daysSpentWorking: 1,
            level: 20,
            roll: 40,
            dc: 40,
        });
    });

    test("should earn a critical success with variant proficiency without level", () => {
        const level = 20;
        const dc = calculateDC(level, { proficiencyWithoutLevel: true });
        expect(
            earnIncome({
                level: 20,
                days: 1,
                rollBrief: { dieValue: 20, modifier: 0 },
                proficiency: 4,
                options,
                dc,
            })
        ).toMatchObject({
            rewards: {
                combined: { gp: 300 },
                perDay: { gp: 300 },
            },
            degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            daysSpentWorking: 1,
            level: 20,
            roll: 20,
            dc: 20,
        });
    });
});
