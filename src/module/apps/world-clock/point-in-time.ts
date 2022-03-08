import { DateTime } from "luxon";

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
        // no HourNumbers etc because not exported
        public readonly hour: number,
        public readonly minute: number,
        public readonly second: number
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
        const currentSecondsOfDay = TimeOfDay.getSecondsOfDay(worldTime.hour, worldTime.minute, worldTime.second);
        const changeToSecondsOfDay = TimeOfDay.getSecondsOfDay(this.hour, this.minute, this.second);

        const targetDayDifference = TimeOfDay.getTargetDayDifferenceInDays(
            currentSecondsOfDay,
            changeToSecondsOfDay,
            mode
        );
        const targetDay = worldTime.plus({
            day: targetDayDifference,
        });
        const targetDateTime = targetDay.set({
            hour: this.hour,
            minute: this.minute,
            second: this.second,
        });
        return targetDateTime.diff(worldTime, "seconds").seconds;
    }

    private static getTargetDayDifferenceInDays(currentSecondsOfDay: number, changeToSecondsOfDay: number, mode: Mode) {
        // if we have the same point in time, we always want to either skip or rewind a full day
        if (currentSecondsOfDay >= changeToSecondsOfDay && mode === Mode.ADVANCE) {
            // case: now: 12:01 and advance to 12:00 -> we need to add 1 day to calculate the difference
            return 1;
        } else if (currentSecondsOfDay <= changeToSecondsOfDay && mode === Mode.RETRACT) {
            // case: now: 12:00 and retract to 12:01 -> we need to subtract 1 day to calculate the difference
            return -1;
        } else {
            return 0;
        }
    }

    private static getSecondsOfDay(hours: number, minutes: number, seconds: number): number {
        return hours * 60 * 60 + minutes * 60 + seconds;
    }
}
