export {};

declare global {
    /**
     * A common framework for displaying notifications to the client.
     * Submitted notifications are added to a queue, and up to 3 notifications are displayed at once.
     * Each notification is displayed for 5 seconds at which point further notifications are pulled from the queue.
     *
     * @example
     * ui.notifications.info("This is an info message");
     * ui.notifications.warn("This is a warning message");
     * ui.notifications.error("This is an error message");
     * ui.notifications.info("This is a 4th message which will not be shown until the first info message is done");
     */
    class Notifications extends Application {
        /** Submitted notifications which are queued for display */
        queue: NotificationData[];

        /** Notifications which are currently displayed */
        active: JQuery[];

        constructor(options: ApplicationOptions);

        /** Initialize the Notifications system by displaying any system-generated messages which were passed from the server. */
        initialize(): void;

        /**
         * Push a new notification into the queue
         * @param message      The content of the notification message
         * @param type         The type of notification, currently "info", "warning", and "error" are supported
         * @param [options={}] Additional options which affect the notification
         * @param [options.permanent=false]   Whether the notification should be permanently displayed unless otherwise dismissed
         * @param [options.localize=false]    Whether to localize the message content before displaying it
         */
        notify(
            message: string,
            type?: "info" | "warning" | "error",
            { localize, permanent }?: NotificationOptions
        ): void;

        /**
         * Display a notification with the "info" type
         * @param message The content of the notification message
         * @param options Notification options passed to the notify function
         */
        info(message: string, options?: NotificationOptions): void;

        /**
         * Display a notification with the "warning" type
         * @param message The content of the notification message
         * @param options Notification options passed to the notify function
         */
        warn(message: string, options?: NotificationOptions): void;

        /**
         * Display a notification with the "error" type
         * @param message The content of the notification message
         * @param options Notification options passed to the notify function
         */
        error(message: string, options?: NotificationOptions): void;

        /** Retrieve a pending notification from the queue and display it */
        fetch(): void;
    }
}

interface NotificationOptions {
    localize?: boolean;
    permanent?: boolean;
}

interface NotificationData {
    message: string;
    type: "info" | "warning" | "error";
    timestamp: number;
    permanent: boolean;
}
