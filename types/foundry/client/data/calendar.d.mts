import DataModel from "@common/abstract/data.mjs";
import * as fields from "@common/data/fields.mjs";
import { CalendarConfig, TimeComponents, TimeFormatter } from "./_types.mjs";

/**
 * Game Time Calendar configuration data model.
 */
export default class CalendarData<TComponents extends TimeComponents = TimeComponents> extends DataModel<
    null,
    CalendarDataSchema
> {
    static override defineSchema(): CalendarDataSchema;

    static formatTimestamp<T extends TimeComponents>(calendar: CalendarData<T>, components: T, options: object): string;

    static formatAgo<T extends TimeComponents>(calendar: CalendarData<T>, components: T, options: object): string;

    /**
     * Expand a world time integer into an object containing the relevant time components.
     * @param components An amount of time expressed as components
     * @returns The cumulative time in seconds
     */
    componentsToTime(components: Partial<TComponents>): number;

    /**
     * Compute the difference between some new time and some other time.
     * @param endTime   A time to difference relative to the start time.
     * @param startTime The starting time. If not provided the current world time is used.
     * @returns The time difference expressed as components
     */
    difference(endTime: number | TComponents, startTime?: number | TComponents): TComponents;

    /**
     * Format a time using one of several supported display formats.
     * @param time      The time components to format, by default the current world time.
     * @param formatter The formatter function applied to the time. If a string is provided, it must be a function
     *                  configured in CONFIG.time.formatters. Options passed to the formatter function
     * @returns The formatted date and time string
     */
    format(time?: number | TComponents, formatter?: string | TimeFormatter, options?: object): string;

    /**
     * Test whether a year is a leap year.
     * @param year The year to test
     * @returns Is it a leap year?
     */
    isLeapYear(year: number): boolean;

    /**
     * Expand a world time integer into an object containing the relevant time components.
     * @param time A time in seconds
     * @returns The time expressed as components
     */
    timeToComponents(time?: number): TComponents;
}

export default interface CalendarData<TComponents extends TimeComponents = TimeComponents>
    extends DataModel<null, CalendarDataSchema>,
        fields.ModelPropsFromSchema<CalendarDataSchema> {}

export type CalendarDataSchema = {
    /** The name of the calendar being used. */
    name: fields.StringField<string, string, true, false, true>;

    /** A text description of the calendar configuration. */
    description: fields.StringField<string, string, false, false, true>;

    /** A definition of a year within a calendar. */
    years: fields.SchemaField<{
        /** A definition of how leap years work within a calendar. */
        yearZero: fields.NumberField<number, number, true, false, true>;
        /** The index of days.values that is the first weekday at time=0 */
        firstWeekday: fields.NumberField<number, number, true, false, true>;
        /** A definition of how leap years work within a calendar. */
        leapYear: fields.SchemaField<{
            /** The year number of the first leap year. On or after yearZero. */
            leapStart: fields.NumberField<number, number, true, false, true>;
            /** The number of years between leap years. */
            leapInterval: fields.NumberField<number, number, true, false, true>;
        }>;
    }>;

    /** Month related configuration for a calendar. */
    months: fields.SchemaField<
        {
            /** An array of months in the calendar year. */
            values: fields.ArrayField<fields.SchemaField<MonthSchema>>;
        },
        { values: fields.SourceFromSchema<MonthSchema>[] },
        { values: fields.ModelPropsFromSchema<MonthSchema>[] },
        true,
        true,
        true
    >;

    /** Configuration of days. */
    days: fields.SchemaField<{
        /** The configuration of the days of the week. */
        values: fields.ArrayField<
            fields.SchemaField<{
                name: fields.StringField<string, string, true, false, false>;
                abbreviation: fields.StringField;
                ordinal: fields.NumberField<number, number, true, false, false>;
            }>
        >;
        /** The number of days in a year. */
        daysPerYear: fields.NumberField<number, number, true, false, false>;
        /** The number of hours in a day. */
        hoursPerDay: fields.NumberField<number, number, true, false, false>;
        /** The number of minutes in an hour. */
        minutesPerHour: fields.NumberField<number, number, true, false, false>;
        /** The number of seconds in a minute. */
        secondsPerMinute: fields.NumberField<number, number, true, false, false>;
    }>;

    /** Configuration of seasons. */
    seasons: fields.SchemaField<
        {
            /** An array of seasons in the calendar year. */
            values: fields.ArrayField<
                fields.SchemaField<{
                    /** The full name of the season. */
                    name: fields.StringField<string, string, true, false, false>;
                    /** The abbreviated name of the season. */
                    abbreviation: fields.StringField;
                    /** The ordinal month in which the season starts. */
                    monthStart: fields.NumberField<number, number, true>;
                    /** The day of the month on which the season starts. */
                    monthEnd: fields.NumberField<number, number, true>;
                    /** The ordinal month in which the season ends. */
                    dayStart: fields.NumberField<number, number, true>;
                    /** The day of the month on which the season ends. */
                    dayEnd: fields.NumberField<number, number, true>;
                }>
            >;
        },
        {
            values: {
                name: string;
                abbreviation: string | undefined;
                monthStart: number | null;
                monthEnd: number | null;
                dayStart: number | null;
                dayEnd: number | null;
            }[];
        },
        {
            values: {
                name: string;
                abbreviation: string | undefined;
                monthStart: number | null;
                monthEnd: number | null;
                dayStart: number | null;
                dayEnd: number | null;
            }[];
        },
        true,
        true
    >;
};

/** A definition of a month within a calendar year. */
type MonthSchema = {
    /** The full name of the month. */
    name: fields.StringField<string, string, true, false, false>;
    /** The abbreviated name of the month. */
    abbreviation: fields.StringField;
    /** The ordinal position of this month in the year. */
    ordinal: fields.NumberField<number, number, true, false, false>;
    /** The number of days in the month. */
    days: fields.NumberField<number, number, true, false, false>;
    /** The number of days in the month during a leap year. If not defined the value of days is used. */
    leapDays: fields.NumberField;
};

export const SIMPLIFIED_GREGORIAN_CALENDAR_CONFIG: CalendarConfig;

export {};
