/**
 * Implementation of travel speed https://2e.aonprd.com/Rules.aspx?ID=470
 */
import {sum} from '../../utils';

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
    FULL_SPEED,
    HALF_SPEED,
    ANTICIPATE_AMBUSH,
    AVOID_NOTICE,
    COVER_TRACKS,
    DEFEND,
    DETECT_MAGIC,
    INVESTIGATE,
    REPEAT_A_SPELL,
    SCOUT,
    SEARCH,
    TRACK,
}

export enum DetectionOptions {
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

export function calculateCharacterSpeed(
    defaultSpeedInFeet: number,
    activity: ExplorationActivities,
    detectionOptions: DetectionOptions,
    explorationOptions: ExplorationOptions,
): number {
    const halvedSpeed = defaultSpeedInFeet / 2;
    if (sneaksAtFullSpeed(activity, explorationOptions) || defendsAtFullSpeed(activity, explorationOptions)) {
        return defaultSpeedInFeet;
    } else if (activity === ExplorationActivities.SEARCH) {
        /**
         * When Searching, you take half as long as usual to Search a given area.
         * This means that while exploring, you double the Speed you can move while
         * ensuring you’ve Searched an area before walking into it (up to half your Speed).
         * If you’re legendary in Perception, you instead Search areas four times as quickly.
         */
        let searchSpeedFactor = 1;
        if (explorationOptions.expeditiousSearchLegendary) {
            searchSpeedFactor = 4;
        } else if (explorationOptions.expeditiousSearch) {
            searchSpeedFactor = 2;
        }
        if (detectionOptions === DetectionOptions.DETECT_EVERYTHING) {
            return Math.min(halvedSpeed, searchSpeedFactor * 30);
        } else if (detectionOptions === DetectionOptions.DETECT_BEFORE_WALKING_INTO_IT) {
            return Math.min(halvedSpeed, searchSpeedFactor * 15);
        } else {
            return halvedSpeed;
        }
    } else if (activity === ExplorationActivities.DETECT_MAGIC) {
        if (detectionOptions === DetectionOptions.DETECT_EVERYTHING) {
            return Math.min(halvedSpeed, 30);
        } else if (detectionOptions === DetectionOptions.DETECT_BEFORE_WALKING_INTO_IT) {
            return Math.min(halvedSpeed, 15);
        } else {
            return halvedSpeed;
        }
    } else if (activity === ExplorationActivities.FULL_SPEED) {
        return defaultSpeedInFeet;
    } else {
        // pretty much any travel activity in the CRB halves your speed
        return halvedSpeed;
    }
}

export enum Length {
    MILES,
    FEET,
}

export interface Distance {
    value: number;
    unit: Length;
}

// the Golarion government has decreed that 1 mile is 6000 feet
// see https://2e.aonprd.com/Rules.aspx?ID=470
const golarionMileInFeet = 6000;

/**
 * Fucking imperial units
 *
 * @param distance
 */
function toFeet(distance: Distance): number {
    if (distance.unit === Length.MILES) {
        return distance.value * golarionMileInFeet;
    } else {
        return distance.value;
    }
}

export enum TimeFrame {
    MINUTE,
    HOUR,
}

export interface Velocity {
    distance: Distance;
    timeFrame: TimeFrame;
}

export function speedToVelocity(speedInFeet: number): Velocity {
    return {
        distance: {
            unit: Length.FEET,
            value: speedInFeet * 10,
        },
        timeFrame: TimeFrame.MINUTE,
    };
}

function toFeetPerMinute(velocity: Velocity): number {
    if (velocity.timeFrame === TimeFrame.MINUTE) {
        return toFeet(velocity.distance);
    } else {
        return toFeetPerMinute({
            distance: {
                unit: velocity.distance.unit,
                value: velocity.distance.value / 60,
            },
            timeFrame: TimeFrame.MINUTE,
        });
    }
}

export interface TravelSpeed {
    feetPerMinute: number;
    feetPerHour: number;
    feetPerDay: number;
}

function toTravelSpeed(velocity: Velocity): TravelSpeed {
    const feetPerMinute = toFeetPerMinute(velocity);
    return {
        feetPerMinute: feetPerMinute,
        feetPerHour: feetPerMinute * 60,
        // only 8 hours per day are available for travelling
        feetPerDay: feetPerMinute * 60 * 8,
    };
}

export enum Terrain {
    NORMAL,
    DIFFICULT,
    GREATER_DIFFICULT,
}

export interface TerrainCost {
    normal: number;
    difficult: number;
    greaterDifficult: number;
}

export interface Trip {
    terrain: Terrain;
    distance: Distance;
    terrainCost: TerrainCost;
}

/**
 * Instead of making a creature slower, we just increase the
 * distance by applying the travel cost to it
 */
function normalizeDistance(trip: Trip): number {
    const feet = toFeet(trip.distance);
    if (trip.terrain === Terrain.DIFFICULT) {
        return feet * trip.terrainCost.difficult;
    } else if (trip.terrain === Terrain.GREATER_DIFFICULT) {
        return feet * trip.terrainCost.greaterDifficult;
    } else {
        return feet * trip.terrainCost.normal;
    }
}

export interface TravelDuration {
    days: number;
    hours: number;
    minutes: number;
}

function toTravelDuration(distanceInFeet: number, speed: TravelSpeed): TravelDuration {
    const days = Math.floor(distanceInFeet / speed.feetPerDay);
    const hours = Math.floor((distanceInFeet - days * speed.feetPerDay) / speed.feetPerHour);
    const minutes = Math.round(
        (distanceInFeet - days * speed.feetPerDay - hours * speed.feetPerHour) / (speed.feetPerHour / 60),
    );
    // TODO: ensure that when rounding up to 60 minutes we use 0 minutes and increase hours by 1
    // TODO: to combat rounding errors from terrain.
    return {
        days,
        hours,
        minutes,
    };
}

export function calculateTravelDuration(journey: Trip[], velocity: Velocity): TravelDuration {
    const feetNormalizedDistance = sum(journey.map(normalizeDistance));
    const speed = toTravelSpeed(velocity);
    return toTravelDuration(feetNormalizedDistance, speed);
}
