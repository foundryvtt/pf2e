import { RenderFlag } from "../interaction/_types.mjs";

/**
 * A helper class which manages the refresh workflow for perception layers on the canvas.
 * This controls the logic which batches multiple requested updates to minimize the amount of work required.
 * A singleton instance is available as canvas#perception.
 * @see {Canvas#perception}
 */
export default class PerceptionManager {
    /**
     * The set of state flags which are supported by the Perception Manager.
     * When a refresh occurs, operations associated with each true flag are executed and the state is reset.
     */
    static FLAGS: {
        // Edges
        refreshEdges: RenderFlag;

        // Light and Darkness Sources
        initializeLighting: { propagate: ["initializeDarknessSources", "initializeLightSources"] };
        initializeDarknessSources: { propagate: ["refreshLighting", "refreshVision", "refreshEdges"] };
        initializeLightSources: { propagate: ["refreshLighting", "refreshVision"] };
        refreshLighting: { propagate: ["refreshLightSources"] };
        refreshLightSources: RenderFlag;

        // Vision
        initializeVisionModes: { propagate: ["refreshVisionSources", "refreshLighting", "refreshPrimary"] };
        initializeVision: { propagate: ["initializeVisionModes", "refreshVision"] };
        refreshVision: { propagate: ["refreshVisionSources", "refreshOcclusionMask"] };
        refreshVisionSources: RenderFlag;

        // Primary Canvas Group
        refreshPrimary: RenderFlag;
        refreshOcclusion: { propagate: ["refreshOcclusionStates", "refreshOcclusionMask"] };
        refreshOcclusionStates: RenderFlag;
        refreshOcclusionMask: RenderFlag;

        // Sound
        initializeSounds: { propagate: ["refreshSounds"] };
        refreshSounds: RenderFlag;
        soundFadeDuration: RenderFlag;
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
     */
    update(flags: { [K in keyof typeof PerceptionManager.FLAGS]?: true }): void;

    /**
     * A helper function to perform an immediate initialization plus incremental refresh.
     */
    initialize(): void;

    /**
     * A helper function to perform an incremental refresh only.
     */
    refresh(): void;
}
