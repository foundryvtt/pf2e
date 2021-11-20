import { Fraction, sum } from "@util";

/**
 * Implementation of travel speed https://2e.aonprd.com/Rules.aspx?ID=470
 */
export interface ExplorationOptions {
    practicedDefender: boolean;
    swiftSneak: boolean;
    legendarySneak: boolean;
    expeditiousSearch: boolean;
    expeditiousSearchLegendary: boolean;
}

/**
 * Travel speed can be affected by limiting exploration activities:
 *
 * Maximum feet speed:
 * * Detect Magic https://2e.aonprd.com/Actions.aspx?ID=513
 * * Search https://2e.aonprd.com/Actions.aspx?ID=519
 * Half speed:
 * * Search https://2e.aonprd.com/Actions.aspx?ID=519
 * * Cover Tracks https://2e.aonprd.com/Actions.aspx?ID=65
 * * Repeat a Spell https://2e.aonprd.com/Actions.aspx?ID=517
 * * Defend https://2e.aonprd.com/Actions.aspx?ID=512
 * * Scout https://2e.aonprd.com/Actions.aspx?ID=518
 * * Track https://2e.aonprd.com/Actions.aspx?ID=66
 * * Avoid Notice https://2e.aonprd.com/Actions.aspx?ID=511
 *
 * Feats that increase speed:
 * * Swift Sneak https://2e.aonprd.com/Feats.aspx?ID=850
 * * Legendary Sneak https://2e.aonprd.com/Feats.aspx?ID=807
 * * Expeditious Search https://2e.aonprd.com/Feats.aspx?ID=777
 * * Practiced Defender https://2e.aonprd.com/Feats.aspx?ID=2257
 *
 * Note: Hustle https://2e.aonprd.com/Actions.aspx?ID=515 does not
 * give you any information in what time frame this works and
 * hexploration specifically excludes hustling from overland
 * travel https://2e.aonprd.com/Rules.aspx?ID=1275
 */
export enum ExplorationActivities {
    NONE,
    HALF_SPEED,
    AVOID_NOTICE,
    DEFEND,
    DETECT_MAGIC,
    SCOUT,
    SEARCH,
}

export enum DetectionMode {
    NONE,
    DETECT_EVERYTHING,
    DETECT_BEFORE_WALKING_INTO_IT,
}

function sneaksAtFullSpeed(activity: ExplorationActivities, explorationOptions: ExplorationOptions) {
    return (
        activity === ExplorationActivities.AVOID_NOTICE &&
        (explorationOptions.legendarySneak || explorationOptions.swiftSneak)
    );
}

function defendsAtFullSpeed(activity: ExplorationActivities, explorationOptions: ExplorationOptions) {
    return activity === ExplorationActivities.DEFEND && explorationOptions.practicedDefender;
}

export function calculateNormalizedCharacterSpeed(
    defaultSpeedInFeet: number,
    activity: ExplorationActivities,
    detectionMode: DetectionMode,
    explorationOptions: ExplorationOptions
): number {
    // you can be reduced below 5 ft, also gets rid of division by 0
    return Math.max(5, calculateCharacterSpeed(defaultSpeedInFeet, activity, detectionMode, explorationOptions));
}

function calculateCharacterSpeed(
    defaultSpeedInFeet: number,
    activity: ExplorationActivities,
    detectionMode: DetectionMode,
    explorationOptions: ExplorationOptions
): number {
    const halvedSpeed = defaultSpeedInFeet / 2;
    if (sneaksAtFullSpeed(activity, explorationOptions) || defendsAtFullSpeed(activity, explorationOptions)) {
        return defaultSpeedInFeet;
    } else if (activity === ExplorationActivities.SEARCH) {
        /**
         * When Searching, you take half as long as usual to Search a given area.
         * This means that while exploring, you double the Speed you can move while
         * ensuring you've Searched an area before walking into it (up to half your Speed).
         * If you're legendary in Perception, you instead Search areas four times as quickly.
         */
        let searchSpeedFactor = 1;
        if (explorationOptions.expeditiousSearchLegendary) {
            searchSpeedFactor = 4;
        } else if (explorationOptions.expeditiousSearch) {
            searchSpeedFactor = 2;
        }
        if (detectionMode === DetectionMode.DETECT_EVERYTHING) {
            return Math.min(halvedSpeed, searchSpeedFactor * 30);
        } else if (detectionMode === DetectionMode.DETECT_BEFORE_WALKING_INTO_IT) {
            return Math.min(halvedSpeed, searchSpeedFactor * 15);
        } else {
            return halvedSpeed;
        }
    } else if (activity === ExplorationActivities.DETECT_MAGIC) {
        if (detectionMode === DetectionMode.DETECT_EVERYTHING) {
            return Math.min(halvedSpeed, 30);
        } else if (detectionMode === DetectionMode.DETECT_BEFORE_WALKING_INTO_IT) {
            return Math.min(halvedSpeed, 15);
        } else {
            return halvedSpeed;
        }
    } else if (activity === ExplorationActivities.NONE) {
        return defaultSpeedInFeet;
    } else {
        return halvedSpeed;
    }
}

export enum LengthUnit {
    MILES,
    FEET,
}

export interface Distance {
    value: number;
    unit: LengthUnit;
}

// the Golarion government has decreed that 1 mile is 6000 feet
// see https://2e.aonprd.com/Rules.aspx?ID=470
const golarionMileInFeet = 6000;

function toFeet(distance: Distance): number {
    if (distance.unit === LengthUnit.MILES) {
        return distance.value * golarionMileInFeet;
    } else {
        return distance.value;
    }
}

export enum TimeUnit {
    MINUTE,
    HOUR,
}

export interface Velocity {
    distance: Distance;
    time: TimeUnit;
}

export function speedToVelocity(speedInFeet: number): Velocity {
    return {
        distance: {
            unit: LengthUnit.FEET,
            value: speedInFeet * 10,
        },
        time: TimeUnit.MINUTE,
    };
}

function toFeetPerMinute(velocity: Velocity): number {
    if (velocity.time === TimeUnit.MINUTE) {
        return toFeet(velocity.distance);
    } else {
        return toFeetPerMinute({
            distance: {
                unit: velocity.distance.unit,
                value: velocity.distance.value / 60,
            },
            time: TimeUnit.MINUTE,
        });
    }
}

export enum Terrain {
    NORMAL,
    DIFFICULT,
    GREATER_DIFFICULT,
}

export interface TerrainSlowdown {
    normal: Fraction;
    difficult: Fraction;
    greaterDifficult: Fraction;
}

export interface Trip {
    terrain: Terrain;
    distance: Distance;
    terrainSlowdown: TerrainSlowdown;
}

/**
 * Instead of making a creature slower, we just increase the
 * distance by applying the travel cost to it to hope for less
 * rounding errors
 */
function increaseDistanceByTerrain(trip: Trip): number {
    const feet = toFeet(trip.distance);
    if (trip.terrain === Terrain.DIFFICULT) {
        return (feet * trip.terrainSlowdown.difficult.numerator) / trip.terrainSlowdown.difficult.denominator;
    } else if (trip.terrain === Terrain.GREATER_DIFFICULT) {
        return (
            (feet * trip.terrainSlowdown.greaterDifficult.numerator) / trip.terrainSlowdown.greaterDifficult.denominator
        );
    } else {
        return (feet * trip.terrainSlowdown.normal.numerator) / trip.terrainSlowdown.normal.denominator;
    }
}

export interface TravelDuration {
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
}

// general constants
const minutesPerHour = 60;
const daysPerWeek = 7;

/**
 * Calculates how long it would take to traverse a certain distance when moving at a certain
 * speed and hustling x hours per day. Hustling rules don't specify a set time frame, just
 * a maximum duration during which you are able to move at double speed. Looking at the feats
 * and spells that increase your hustling duration, we deduced that the maximum hustling
 * duration is per day.
 *
 * @param distanceInFeet
 * @param feetPerMinute
 * @param hustleDurationInMinutes
 * @param hoursPerDay how many hours you travel per day, reduced by hot or cold climate
 */
function toTravelDuration({
    distanceInFeet,
    feetPerMinute,
    hustleDurationInMinutes,
    hoursPerDay = 8,
}: {
    distanceInFeet: number;
    feetPerMinute: number;
    hustleDurationInMinutes: number;
    hoursPerDay?: number;
}): TravelDuration {
    const minutesPerDay = hoursPerDay * minutesPerHour;
    const minutesPerWeek = minutesPerDay * daysPerWeek;

    // calculate average speed increased by hustling
    const hustleDuration = Math.min(hustleDurationInMinutes, minutesPerDay);
    const normalTravelDuration = minutesPerDay - hustleDuration;
    const averageSpeed = (feetPerMinute * 2 * hustleDuration + feetPerMinute * normalTravelDuration) / minutesPerDay;

    // calculate weeks and days using the increased average speed
    const totalMinutes = Math.round(distanceInFeet / averageSpeed);
    const weeks = Math.floor(totalMinutes / minutesPerWeek);
    const days = Math.floor((totalMinutes - weeks * minutesPerWeek) / minutesPerDay);

    // For the remaining distance we need to calculate them differently: a player usually wants
    // to hustle at the start of a day so the first x minutes are spent hustling, while
    // the remaining use the normal speed.
    const remainingDistanceInFeet =
        distanceInFeet - weeks * minutesPerWeek * averageSpeed - days * minutesPerDay * averageSpeed;
    // calculate how long it would take while hustling all day, then subtract minutes spent hustling
    // remaining minutes are spent moving at normal speed so duration increases two times
    const remainingMinutesMovingAtDoubleSpeed = remainingDistanceInFeet / (feetPerMinute * 2);
    const remainingMinutesSpentHustling =
        Math.min(remainingMinutesMovingAtDoubleSpeed, hustleDurationInMinutes) +
        Math.max(0, remainingMinutesMovingAtDoubleSpeed - hustleDurationInMinutes) * 2;

    const hours = Math.floor(remainingMinutesSpentHustling / minutesPerHour);
    const minutes = Math.round(remainingMinutesSpentHustling - hours * minutesPerHour);
    return {
        weeks,
        days,
        hours,
        minutes,
    };
}

export function calculateTravelDuration({
    journey,
    velocity,
    hustleDurationInMinutes = 0,
    hoursPerDay = 8,
}: {
    journey: Trip[];
    velocity: Velocity;
    hustleDurationInMinutes?: number;
    hoursPerDay?: number;
}): TravelDuration {
    const distanceInFeet = sum(journey.map(increaseDistanceByTerrain));
    const feetPerMinute = toFeetPerMinute(velocity);
    return toTravelDuration({ distanceInFeet, feetPerMinute, hustleDurationInMinutes, hoursPerDay });
}
