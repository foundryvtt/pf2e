import { DateTime, HourNumbers, MinuteNumbers, SecondNumbers } from "luxon";

type TimeChangeMode = "advance" | "retract";

class TimeOfDay {
    /** Point in morning twilight where dim light begins */
    static get DAWN(): TimeOfDay {
        const dawnTime = game.pf2e.settings.worldClock.dawnTime;
        TimeOfDay.#DAWN.hour = dawnTime.hour;
        TimeOfDay.#DAWN.minute = dawnTime.minute;
        return TimeOfDay.#DAWN;
    }

    static #DAWN = new TimeOfDay(6);

    static NOON = new TimeOfDay(12);

    /** Point in evening twilight where dim light begins */
    static get DUSK(): TimeOfDay {
        const duskTime = game.pf2e.settings.worldClock.duskTime;
        TimeOfDay.#DUSK.hour = duskTime.hour;
        TimeOfDay.#DUSK.minute = duskTime.minute;
        return TimeOfDay.#DUSK;
    }

    static #DUSK = new TimeOfDay(18);

    static MIDNIGHT = new TimeOfDay(0);

    constructor(hour: HourNumbers, minute: MinuteNumbers = 0, second: SecondNumbers = 0) {
        this.hour = hour;
        this.minute = minute;
        this.second = second;
    }

    hour: HourNumbers;

    minute: MinuteNumbers;

    second: SecondNumbers;

    /**
     * Returns positive or negative number of seconds to add to current
     * game time advance function https://foundryvtt.com/api/classes/foundry.helpers.GameTime.html#advance
     * @param worldTime the current time as luxon DateTime
     * @param mode whether to go back to that point in time or to advance
     */
    diffSeconds(worldTime: DateTime, mode: TimeChangeMode): number {
        const targetTime = worldTime.set(this);

        const targetDayDifference = this.#diffDays(worldTime, targetTime, mode);
        const targetDay = worldTime.plus({ day: targetDayDifference });
        return targetDay.set(this).diff(worldTime, "seconds").seconds;
    }

    #diffDays(currentTime: DateTime, targetTime: DateTime, mode: TimeChangeMode): -1 | 0 | 1 {
        // If we have the same point in time, we always want to either skip or rewind a full day
        if (currentTime >= targetTime && mode === "advance") {
            // case: now: 12:01 and advance to 12:00 -> we need to add 1 day to calculate the difference
            return 1;
        } else if (currentTime <= targetTime && mode === "retract") {
            // case: now: 12:00 and retract to 12:01 -> we need to subtract 1 day to calculate the difference
            return -1;
        } else {
            return 0;
        }
    }
}

export { TimeOfDay, type TimeChangeMode };
