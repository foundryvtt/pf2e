export {};

declare global {
    /**
     * A helper class which manages the refresh workflow for perception layers on the canvas.
     * This controls the logic which batches multiple requested updates to minimize the amount of work required.
     * A singleton instance is available as canvas#perception.
     * @see {Canvas#perception}
     */
    class PerceptionManager {
        constructor();

        /** The number of milliseconds by which to throttle non-immediate refreshes */
        protected _throttleMS: number;

        /** An internal tracker for the last time that a perception refresh was executed */
        _refreshTime: number;

        /** An internal tracker for the window timeout that applies a debounce to the refresh */
        protected _timeout: number;

        /** Cache a reference to the canvas scene to avoid attempting scheduled refreshes after the scene is changed */
        protected _scene: string;

        /**
         * The default values of update parameters.
         * When a refresh occurs, the staged parameters are reset to these initial values.
         */
        static DEFAULTS: {
            lighting: {
                initialize: boolean;
                refresh: boolean;
            };
            sight: {
                initialize: boolean;
                refresh: boolean;
                skipUpdateFog: boolean;
                forceUpdateFog: boolean;
            };
            sounds: {
                initialize: boolean;
                refresh: boolean;
                fade: boolean;
            };
            foreground: {
                initialize: boolean;
                refresh: boolean;
                fade: boolean;
            };
        };

        /** The configured parameters for the next refresh. */
        params: PerceptionManagerParameters;

        /** Cancel any pending perception refresh. */
        cancel(): void;

        /** Schedule a perception update with requested parameters. */
        schedule(options?: PerceptionManagerParameters): void;

        /** Perform an immediate perception update. */
        update(options?: PerceptionManagerParameters): void;

        /** A helper function to perform an immediate initialization plus incremental refresh. */
        initialize(): void;

        /** A helper function to perform an incremental refresh only. */
        refresh(): void;

        /* -------------------------------------------- */
        /*  Internal Helpers                            */
        /* -------------------------------------------- */

        /** Set option flags which configure the next perception update */
        protected _set(options: PerceptionManagerParameters): void;

        /**
         * Perform the perception update workflow
         * @param immediate Perform the workflow immediately, otherwise it is throttled
         */
        protected _update(immediate?: boolean): void;

        /** Reset the values of a pending refresh back to their default states. */
        protected _reset(): void;
    }
}

type PerceptionManagerParameters = DeepPartial<typeof PerceptionManager["DEFAULTS"]>;
