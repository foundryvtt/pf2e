export {};

declare global {
    /**
     * A data structure for tracking a set of boolean status flags.
     * This is a restricted set which can only accept flag values which are pre-defined.
     * @param {Object<RenderFlag>} flags  An object which defines the flags which are supported for tracking
     * @param {object} [config]           Optional configuration
     * @param {RenderFlagObject} [config.object]  The object which owns this RenderFlags instance
     * @param {number} [config.priority]          The ticker priority at which these render flags are handled
     */
    class RenderFlags extends Set<string> {
        constructor(flags?: Record<string, RenderFlag>, config?: { object?: PlaceableObject; priority?: number });

        /**
         * @returns The flags which were previously set that have been cleared.
         */
        override clear(): Record<string, boolean>;

        /**
         * Allow for handling one single flag at a time.
         * This function returns whether the flag needs to be handled and removes it from the pending set.
         */
        handle(flag: string): boolean;

        /**
         * Activate certain flags, also toggling propagation and reset behaviors
         * @param {Object<boolean>} changes
         */
        set(changes: Record<string, boolean>): void;
    }

    interface RenderFlag {
        /** Activating this flag also sets these flags to true */
        propagate: string[];
        /** Activating this flag resets these flags to false */
        reset: string[];
    }
}
