export {};

declare global {
    /**
     * A helper class which manages the refresh workflow for perception layers on the canvas.
     * This controls the logic which batches multiple requested updates to minimize the amount of work required.
     * A singleton instance is available as canvas#perception.
     * @see {Canvas#perception}
     */
    class PerceptionManager {
        /**
         * The set of state flags which are supported by the Perception Manager.
         * When a refresh occurs, operations associated with each true flag are executed and the state is reset.
         */
        static FLAGS: {
            initializeLighting: { propagate: ["refreshLighting"]; reset: [] };
            refreshLighting: { propagate: ["refreshLightSources"]; reset: [] };
            refreshLightSources: { propagate: []; reset: [] };
            refreshVisionSources: { propagate: []; reset: [] };
            refreshPrimary: { propagate: []; reset: [] };
            initializeVision: {
                propagate: [
                    "refreshVision",
                    "refreshTiles",
                    "refreshLighting",
                    "refreshLightSources",
                    "refreshPrimary",
                ];
                reset: [];
            };
            refreshVision: { propagate: ["refreshVisionSources"]; reset: [] };
            initializeSounds: { propagate: ["refreshSounds"]; reset: [] };
            refreshSounds: { propagate: []; reset: [] };
            refreshTiles: { propagate: ["refreshLightSources", "refreshVisionSources"]; reset: [] };
            soundFadeDuration: { propagate: []; reset: [] };
            forceUpdateFog: { propagate: []; reset: [] };
        };

        /* -------------------------------------------- */
        /*  Perception Manager Methods                  */
        /* -------------------------------------------- */

        /**
         * Activate perception management by registering the update function to the Ticker.
         */
        activate(): void;

        /**
         * Deactivate perception management by un-registering the update function from the Ticker.
         */
        deactivate(): void;

        /**
         * Update perception manager flags which configure which behaviors occur on the next frame render.
         * @param flags      Flag values (true) to assign where the keys belong to PerceptionManager.FLAGS
         * @param [v2=false] Opt-in to passing v2 flags, otherwise a backwards compatibility shim will be applied
         */
        update(flags: { [K in keyof typeof PerceptionManager.FLAGS]?: true }, v2?: boolean): void;

        /**
         * A helper function to perform an immediate initialization plus incremental refresh.
         */
        initialize(): void;

        /**
         * A helper function to perform an incremental refresh only.
         */
        refresh(): void;
    }
}
