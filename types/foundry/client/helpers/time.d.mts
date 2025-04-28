import { CalendarData, TimeComponents } from "@client/data/_module.mjs";

/**
 * A singleton class at which keeps the official Server and World time stamps.
 * Uses a basic implementation of https://www.geeksforgeeks.org/cristians-algorithm/ for synchronization.
 * @see {@link Game#time}
 */
export default class GameTime {
    constructor();

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The calendar instance for in-world timekeeping.
     */
    get calendar(): CalendarData;

    /**
     * The "Earth" calendar instance for IRL timekeeping.
     */
    get earthCalendar(): CalendarData;

    /**
     * The current server time based on the last synchronization point and the approximated one-way latency.
     */
    get serverTime(): number;

    /**
     * * The current World time expressed in seconds.
     */
    get worldTime(): number;

    /**
     * The current World time expressed as components.
     * @type {}
     */
    get components(): TimeComponents;

    /**
     * The average one-way latency between client and server in milliseconds.
     */
    get averageLatency(): number;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Initialize a calendar configuration.
     * This is called once automatically upon construction, but can be called manually if CONFIG.time changes.
     */
    initializeCalendar(): void;

    /**
     * Advance or rewind the world time according to a delta amount expressed either in seconds or as components.
     * @param delta The number of seconds to advance (or rewind if negative) by
     * @param options Additional options passed to game.settings.set
     * @returns The new game time
     */
    advance(delta: TimeComponents | number, options?: object): Promise<number>;

    /**
     * Directly set the world time to a certain value expressed either in seconds or as components.
     * @param time The desired world time
     * @param options Additional options passed to game.settings.set
     * @returns The new game time
     */
    set(time: TimeComponents | number, options?: object): Promise<number>;

    /* -------------------------------------------- */
    /*  Synchronization and Update Methods          */
    /* -------------------------------------------- */

    /**
     * Synchronize the local client game time with the official time kept by the server
     */
    sync(): Promise<this>;

    /* -------------------------------------------- */
    /*  Event Handlers and Callbacks                */
    /* -------------------------------------------- */

    /**
     * Handle follow-up actions when the official World time is changed
     * @param worldTime The new canonical World time.
     * @param options   Options passed from the requesting client where the change was made
     * @param userId    The ID of the User who advanced the time
     */
    onUpdateWorldTime(worldTime: number, options: object, userId: string): void;
}
