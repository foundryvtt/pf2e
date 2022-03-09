import { Mode, TimeOfDay } from "@module/apps/world-clock/point-in-time";
import { DateTime } from "luxon";

describe("Time Of Day Calculation", () => {
    const noon = DateTime.fromObject({
        day: 1,
        month: 1,
        year: 2022,
        hour: 12,
        minute: 0,
        second: 0,
    });
    test("advancing/rewinding to same time of day should skip/rewind a day", () => {
        const time = new TimeOfDay(12, 0, 0);

        expect(time.calculateSecondsDifference(noon, Mode.ADVANCE)).toBe(24 * 60 * 60);
        expect(time.calculateSecondsDifference(noon, Mode.RETRACT)).toBe(-24 * 60 * 60);
    });

    test("advancing from 12:00:00 to 12:59:59", () => {
        const time = new TimeOfDay(12, 59, 59);

        expect(time.calculateSecondsDifference(noon, Mode.ADVANCE)).toBe(59 * 60 + 59);
    });

    test("retracting from 12:00:00 to 11:00:01", () => {
        const time = new TimeOfDay(11, 0, 1);

        expect(time.calculateSecondsDifference(noon, Mode.RETRACT)).toBe((59 * 60 + 59) * -1);
    });

    test("advancing from 12:00:00 to 11:59:59", () => {
        const time = new TimeOfDay(11, 59, 59);

        expect(time.calculateSecondsDifference(noon, Mode.ADVANCE)).toBe(23 * 60 * 60 + 59 * 60 + 59);
    });

    test("retracting from 12:00:00 to 12:00:01", () => {
        const time = new TimeOfDay(12, 0, 1);

        expect(time.calculateSecondsDifference(noon, Mode.RETRACT)).toBe((23 * 60 * 60 + 59 * 60 + 59) * -1);
    });
});
