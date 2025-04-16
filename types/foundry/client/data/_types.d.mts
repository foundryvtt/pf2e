import { ModelPropsFromSchema } from "@common/data/fields.mjs";
import CalendarData, { CalendarDataSchema } from "./calendar.mjs";

/**
 * Default combat tracker settings used in Foundry VTT.
 */
export interface CombatConfigurationData {
    /** A resource identifier for the tracker. */
    resource: string;

    /** Whether to skip defeated tokens during combat. */
    skipDefeated: boolean;

    /** Turn marker configuration. */
    turnMarker: {
        enabled: boolean;
        path: string;
        animation: string;
        disposition: string;
    };
}

export interface CalendarConfig extends ModelPropsFromSchema<CalendarDataSchema> {}

/** A definition of a year within a calendar. */
export type CalendarConfigYears = CalendarConfig["years"];

/** A definition of how leap years work within a calendar. */
export type CalendarConfigLeapYear = CalendarConfigYears["leapYear"];

/** Month related configuration for a calendar. */
export type CalendarConfigMonths = NonNullable<CalendarConfig["months"]>;

/** A definition of a month within a calendar year. */
export type CalendarConfigMonth = CalendarConfigMonths["values"][number];

/** Day related configuration for a calendar. */
export type CalendarConfigDays = CalendarConfig["years"];

/** A definition of the days of the week within a calendar. */
export interface CalendarConfigDay {
    /** The full name of the weekday. */
    name: string;

    /** The abbreviated name of the weekday. */
    abbreviation?: string;

    /** The ordinal position of this weekday in the week. */
    ordinal: number;

    /** Is this weekday considered a rest day (weekend)? */
    isRestDay?: boolean;
}

/** Season related configuration for a calendar. */
export type CalendarConfigSeasons = NonNullable<CalendarConfig["seasons"]>;

/** A definition of a season within a calendar year. */
export type CalendarConfigSeason = CalendarConfigSeasons["values"][number];

/**
 * A decomposition of the integer world time in seconds into component parts.
 * Each component expresses the number of that temporal unit since the time=0 epoch.
 */
export interface TimeComponents {
    /** The number of years completed since zero */
    year: number;

    /** The number of days completed within the year */
    day: number;

    /** The number of hours completed within the year */
    hour: number;

    /** The number of minutes completed within the hour */
    minute: number;

    /** The number of seconds completed within the minute */
    second: number;

    /** The month, an index of the months.values array */
    month: number;

    /** The day of the month, starting from zero */
    dayOfMonth: number;

    /** The weekday, an index of the days.values array */
    dayOfWeek: number;

    /** The season, an index of the seasons.values array */
    season: number;

    /** Is it a leap year? */
    leapYear: boolean;
}

export type TimeFormatter = (calendar: CalendarData, components: TimeComponents, options: object) => string;
