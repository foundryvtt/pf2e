import { DateTime, HourNumbers, MinuteNumbers, SecondNumbers } from "luxon";

enum TimeChangeMode {
    ADVANCE,
    RETRACT,
}

class TimeOfDay {
    constructor(
        public readonly hour: HourNumbers,
        public readonly minute: MinuteNumbers,
        public readonly second: SecondNumbers
    ) {}

    /** Point in morning twilight where dim light begins */
    static DAWN = new TimeOfDay(4, 58, 54);

    static NOON = new TimeOfDay(12, 0, 0);

    /** Point in evening twilight where dim light begins */
    static DUSK = new TimeOfDay(18, 34, 6);

    static MIDNIGHT = new TimeOfDay(0, 0, 0);

    /**
     * Returns positive or negative number of seconds to add to current
     * game time advance function https://foundryvtt.com/api/GameTime.hbs#advance
     * @param worldTime the current time as luxon DateTime
     * @param mode whether to go back to that point in time or to advance
     */
    diffSeconds(worldTime: DateTime, mode: TimeChangeMode): number {
        const targetTime = worldTime.set(this);
        const targetDayDifference = TimeOfDay.diffDays(worldTime, targetTime, mode);
        const targetDay = worldTime.plus({ day: targetDayDifference });

        return targetDay.set(this).diff(worldTime, "seconds").seconds;
    }

    private static diffDays(currentTime: DateTime, targetTime: DateTime, mode: TimeChangeMode): -1 | 0 | 1 {
        // if we have the same point in time, we always want to either skip or rewind a full day
        if (currentTime >= targetTime && mode === TimeChangeMode.ADVANCE) {
            // case: now: 12:01 and advance to 12:00 -> we need to add 1 day to calculate the difference
            return 1;
        } else if (currentTime <= targetTime && mode === TimeChangeMode.RETRACT) {
            // case: now: 12:00 and retract to 12:01 -> we need to subtract 1 day to calculate the difference
            return -1;
        } else {
            return 0;
        }
    }
}

export { TimeChangeMode, TimeOfDay };
