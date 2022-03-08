// eslint-disable-next-line import/named
import { DateTime, HourNumbers, MinuteNumbers, SecondNumbers } from "luxon";

export enum Mode {
    ADVANCE,
    RETRACT,
}

export interface PointInTime {
    /**
     * Returns positive or negative number of seconds to add to current
     * game time advance function https://foundryvtt.com/api/GameTime.html#advance
     * @param worldTime the current time as luxon DateTime
     * @param mode whether to go back to that point in time or to advance
     */
    calculateSecondsDifference(worldTime: DateTime, mode: Mode): number;
}

export class TimeOfDay implements PointInTime {
    constructor(
        public readonly hour: HourNumbers,
        public readonly minute: MinuteNumbers,
        public readonly second: SecondNumbers
    ) {}

    static dawn(): TimeOfDay {
        return new TimeOfDay(6, 0, 0);
    }

    static noon(): TimeOfDay {
        return new TimeOfDay(12, 0, 0);
    }

    static dusk(): TimeOfDay {
        return new TimeOfDay(18, 0, 0);
    }

    public calculateSecondsDifference(worldTime: DateTime, mode: Mode): number {
        const targetTime = DateTime.fromObject({
            year: worldTime.year,
            month: worldTime.month,
            day: worldTime.day,
            hour: this.hour,
            minute: this.minute,
            second: this.second,
        });
        const targetDayDifference = TimeOfDay.getTargetDayDifferenceInDays(worldTime, targetTime, mode);
        const targetDay = worldTime.plus({ day: targetDayDifference });
        const targetDateTime = targetDay.set({
            hour: this.hour,
            minute: this.minute,
            second: this.second,
        });
        return targetDateTime.diff(worldTime, "seconds").seconds;
    }

    private static getTargetDayDifferenceInDays(currentTime: DateTime, targetTime: DateTime, mode: Mode) {
        // if we have the same point in time, we always want to either skip or rewind a full day
        if (currentTime >= targetTime && mode === Mode.ADVANCE) {
            // case: now: 12:01 and advance to 12:00 -> we need to add 1 day to calculate the difference
            return 1;
        } else if (currentTime <= targetTime && mode === Mode.RETRACT) {
            // case: now: 12:00 and retract to 12:01 -> we need to subtract 1 day to calculate the difference
            return -1;
        } else {
            return 0;
        }
    }
}
