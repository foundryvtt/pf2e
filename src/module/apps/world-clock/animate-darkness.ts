import { DateTime, Duration, Interval } from "luxon";
import { WorldClock } from "./app.ts";

interface DarknessTransition {
    /** Target darkness level; between 0 and 1 */
    target: number;
    /** Duration in milliseconds */
    duration: number;
    /** interval for debugging purposes */
    interval?: Interval;
}

const dayInSeconds = Duration.fromObject({ hours: 24 }).as("seconds");

/** Plot darkness level along a cosine of a duration */
function darknessLevelAtTime(time: DateTime) {
    const secondsElapsed = time.diff(time.startOf("day")).as("seconds");
    const radians = 2 * Math.PI * (secondsElapsed / dayInSeconds);
    const lightnessLevel = -1 * Math.cos(radians);
    const rad18degrees = Math.toRadians(18);

    return (
        1 -
        (lightnessLevel > 0
            ? 1
            : lightnessLevel < -rad18degrees
            ? 0
            : Math.sin((((lightnessLevel + rad18degrees) / rad18degrees) * Math.PI) / 2))
    );
}

/** Calculate animateDarkness parameters from a time interval */
function intervalToTransition(interval: Interval, compactInterval: Interval): DarknessTransition {
    const currentDarkness = canvas.darknessLevel;
    const targetDarkness = darknessLevelAtTime(interval.end!);
    const darknessDiff = Math.abs((currentDarkness ?? targetDarkness) - targetDarkness);

    // Cap the darkness transition duration
    const elapsedSeconds = compactInterval.length("seconds");
    const proportionOfDay = elapsedSeconds / dayInSeconds;
    const darkTimeMean = (darknessDiff * 0.5 + proportionOfDay) / 2;

    return {
        target: targetDarkness,
        duration: darkTimeMean * 6000,
        interval: interval,
    };
}

async function runAnimation(transition: DarknessTransition) {
    if (!canvas.lighting || canvas.darknessLevel === transition.target) {
        return;
    }
    const duration = Math.min(Math.trunc(100 * transition.duration) / 100, 6000);
    await canvas.effects.animateDarkness(transition.target, { duration: duration });

    if (game.user.isGM) {
        await canvas.scene!.update({ darkness: transition.target });
    }
}

/** Animate the increase or decrease of the scene darkness level in the syncDarkness setting is enabled */
export async function animateDarkness(this: WorldClock, timeDiff: number): Promise<void> {
    if (!this.syncDarkness) return;

    const newTime = this.worldTime;
    const oldTime = newTime.minus({ seconds: timeDiff });

    const fullInterval = Interval.fromDateTimes(oldTime, newTime);
    if (!fullInterval.isValid) {
        // Don't attempt to calculate an animation if reversing time
        await runAnimation({ target: darknessLevelAtTime(newTime), duration: 100, interval: fullInterval });
        return;
    }

    const compactInterval = (() => {
        if (fullInterval.length("hours") > 24) {
            // Compact the full time interval to >= 24 hours for the purpose of darkness transitions
            const adjustedOldTime = newTime.minus({ hours: 24 });
            return Interval.fromDateTimes(adjustedOldTime, newTime);
        }
        return fullInterval;
    })();

    // Break up the interval into peaks and valleys of darkness
    const transitionTimes = [4.75, 18]
        .map((hour) => compactInterval.start!.set({ hour: hour, minute: 0, second: 0 }))
        .concat([4.75, 18].map((hour) => compactInterval.end!.set({ hour: hour, minute: 0, second: 0 })))
        .filter((dateTime) => compactInterval.contains(dateTime))
        .concat([compactInterval.start!, compactInterval.end!])
        .sort((dtA, dtB) => (dtA < dtB ? -1 : dtA > dtB ? 1 : 0));

    type DateTimePair = [DateTime, DateTime];
    const timePairs: DateTimePair[] = transitionTimes.reduce((pairs: DateTimePair[], dateTime) => {
        const index = transitionTimes.indexOf(dateTime);
        if (index === 0) return [];
        const before = transitionTimes[index - 1];
        return [...pairs, [before, dateTime]];
    }, []);
    const transitionIntervals = timePairs
        .map((pair) => Interval.fromDateTimes(pair[0], pair[1]))
        .filter((interval) => interval.length() > 0);

    const transitions = transitionIntervals.map((interval) => intervalToTransition(interval, compactInterval));

    for (const transition of transitions) {
        await runAnimation(transition);
    }
}
