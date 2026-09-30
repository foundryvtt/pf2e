import { DateTime, Interval } from "luxon";

interface DarknessTransition {
    /** Target darkness level; between 0 and 1 */
    target: number;
    /** Duration in milliseconds */
    duration: number;
    /** interval for debugging purposes */
    interval?: Interval;
}

const SECONDS_PER_DAY = 86_400;
const LIGHT_CURVE = 0.5;

/** Plot the darkness level along a sine curve. */
function darknessLevelAtTime(time: DateTime): number {
    const settings = game.pf2e.settings.worldClock;
    const baseTimeData = { ...time.toObject(), second: 0 };
    const timeOptions = { zone: "utc" };
    const dawnTime = DateTime.fromObject({ ...baseTimeData, ...settings.dawnTime }, timeOptions).minus({ minutes: 30 });
    const duskTime = DateTime.fromObject({ ...baseTimeData, ...settings.duskTime }, timeOptions).plus({ minutes: 30 });
    const dawnToTime = time.diff(dawnTime).as("seconds");
    const dawnToDusk = duskTime.diff(dawnTime).as("seconds");
    const ratio = Math.clamp(dawnToTime / dawnToDusk, 0, 1);
    return 1 - Math.max(0, Math.pow(Math.sin(Math.PI * ratio), LIGHT_CURVE));
}

/** Calculate animateDarkness parameters from a time interval */
function intervalToTransition(interval: Interval<true>, compactInterval: Interval): DarknessTransition {
    const currentDarkness = canvas.darknessLevel;
    const targetDarkness = darknessLevelAtTime(interval.end);
    const darknessDiff = Math.abs((currentDarkness ?? targetDarkness) - targetDarkness);

    // Cap the darkness transition duration
    const elapsedSeconds = compactInterval.length("seconds");
    const proportionOfDay = elapsedSeconds / SECONDS_PER_DAY;
    const darkTimeMean = (darknessDiff * 0.5 + proportionOfDay) / 2;

    return {
        target: targetDarkness,
        duration: darkTimeMean * 6000,
        interval: interval,
    };
}

export { darknessLevelAtTime, intervalToTransition };
export type { DarknessTransition };
