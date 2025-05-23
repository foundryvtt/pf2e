export interface Notification {
    id: number;
    type: string;
    timestamp: number;
    message: string;
    error?: Error;
    permanent: boolean;
    console: boolean;
    active: boolean;
    progress: boolean;
    pct: number;
    element?: HTMLLIElement;
    remove?: () => void;
    update?: (options: { message?: string; pct?: number }) => void;
}

export interface ProgressNotification extends Notification {
    update: (options: { message?: string; pct?: number }) => void;
}

export interface NotificationOptions {
    /** Should the notification be permanently displayed until dismissed */
    permanent?: boolean;
    /** Does this Notification include a progress bar? */
    progress?: boolean;
    /** Whether to localize the message content before displaying it */
    localize?: boolean;
    /** Whether to log the message to the console */
    console?: boolean;
    /** Whether to escape the values of `format` */
    escape?: boolean;
    /**
     * Whether to clean the provided message string as untrusted user input. No cleaning is applied if `format` is
     * passed and `escape` is true or `localize` is true and `format` is not passed.
     */
    clean?: boolean;
    /** A mapping of formatting strings passed to Localization#format */
    format?: Record<string, Maybe<string | number | boolean>>;
}

export interface ProgressNotificationOptions extends NotificationOptions {
    progress: true;
}

/**
 * A common framework for displaying notifications to the client.
 * Submitted notifications are added to a queue, and up to {@link Notifications.MAX_ACTIVE}
 * notifications are displayed at once. Each notification is displayed for
 * {@link Notifications.LIFETIME_MS} milliseconds before being
 * removed, at which point further notifications are pulled from the queue.
 *
 *
 * @example Displaying Notification Messages
 * ```js
 * ui.notifications.error("This is a permanent error message", {permanent: true});
 * ui.notifications.warn("LOCALIZED.WARNING.MESSAGE", {localize: true});
 * ui.notifications.success("This is a success message, not logged to the console", {console: false});
 * ui.notifications.info("LOCALIZED.FORMAT.STRING", {format: {key1: "foo", key2: "bar"}});
 * ```
 *
 * @example Progress Bar Notification
 * ```js
 * const progress = ui.notifications.info("Thing Happening!", {progress: true});
 * progress.update({pct: 0.25, message: "Still happening!"});
 * progress.update({pct: 0.50, message: "Almost there!"});
 * progress.update({pct: 0.75, message: "Stay on target!"});
 * progress.update({pct: 1.0, message: "Done!"});
 * ```
 */
export default class Notifications {
    constructor();

    /**
     * The maximum number of active notifications.
     */
    static MAX_ACTIVE: number;

    /**
     * Notification lifetime in milliseconds.
     */
    static LIFETIME_MS: number;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Push a new notification into the queue
     * @param message The content of the notification message. A passed object should have a meaningful override of the
     *                `toString` method. If the object is an `Error` and console logging is requested, the stack trace
     *                will be included.
     * @param type The type of notification, "info", "warning", and "error" are supported
     * @param options={}] Additional options which affect the notification
     * @returns The registered notification
     */
    notify(
        message: string | object,
        type: "info" | "warning" | "error" | "success",
        options?: NotificationOptions,
    ): Notification;

    /**
     * Display a notification with the "info" type.
     * @param message The content of the info message
     * @param options Notification options passed to the notify function
     * @returns The registered notification
     * @see {@link notify}
     */
    info(message: string | object, options: ProgressNotificationOptions): Readonly<ProgressNotification>;
    info(message: string | object, options?: NotificationOptions): Readonly<Notification>;

    /**
     * Display a notification with the "warning" type.
     * @param message The content of the warning message
     * @param options Notification options passed to the notify function
     * @returns The registered notification
     * @see {@link notify}
     */
    warn(message: string | object, options?: NotificationOptions): Readonly<Notification>;

    /**
     * Display a notification with the "error" type.
     * @param message The content of the error message
     * @param options Notification options passed to the notify function
     * @returns The registered notification
     * @see {@link notify}
     */
    error(message: string | object, options?: NotificationOptions): Readonly<Notification>;

    /**
     * Display a notification with the "success" type.
     * @param message The content of the success message
     * @param options Notification options passed to the notify function
     * @returns The registered notification
     * @see {@link notify}
     */
    success(message: string | object, options?: NotificationOptions): Readonly<Notification>;

    /**
     * Update the progress of the notification.
     * @param notification    A Notification or ID to update
     * @param update An incremental progress update
     * @param update.message An update to the string message
     * @param update.localize Localize updates to presented progress text
     * @param update.escape See {@link NotificationOptions#escape}
     * @param update.clean See {@link NotificationOptions#clean}
     * @param update.format A mapping of formatting strings passed to Localization#format
     * @param update.pct An update to the completion percentage
     */
    update(
        notification: Notification | number,
        update: {
            message?: string;
            localize?: string;
            escape?: string;
            clean?: string;
            format?: Record<string, string>;
            pct?: number;
        },
    ): void;

    /**
     * Remove the notification linked to the ID.
     * @param notification The Notification or ID to remove
     */
    remove(notification: Notification | number): void;

    /**
     * Clear all notifications.
     */
    clear(): void;
}
