import RenderFlags from "../interaction/render-flags.mjs";

export interface PerceptionManagerFlags extends RenderFlags {
    /**
     * Re-initialize the entire lighting configuration. An aggregate behavior
     * which does no work directly but propagates to set several other flags.
     */
    initializeLighting: boolean;
    /**
     * Re-initialize the entire vision configuration.
     * See {@link CanvasVisibilityinitializeSources}.
     */
    initializeVision: boolean;
    /**
     * Initialize the active vision modes.
     * See {@link CanvasVisibilityinitializeVisionMode }.
     */
    initializeVisionModes: boolean;
    /**
     * Re-initialize the entire ambient sound configuration.
     * See {@link SoundsLayerinitializeSources }.
     */
    initializeSounds: boolean;
    /**
     * Recompute intersections between all registered edges.
     * See {@link CanvasEdgesrefresh }.
     */
    refreshEdges: boolean;
    /**
     * Refresh the rendered appearance of lighting
     */
    refreshLighting: boolean;
    /**
     * Update the configuration of light sources
     */
    refreshLightSources: boolean;
    /**
     * Refresh occlusion
     */
    refreshOcclusion: boolean;
    /**
     * Refresh the contents of the PrimaryCanvasGroup mesh
     */
    refreshPrimary: boolean;
    /**
     * Refresh the audio state of ambient sounds
     */
    refreshSounds: boolean;
    /**
     * Refresh the rendered appearance of vision
     */
    refreshVision: boolean;
    /**
     * Update the configuration of vision sources
     */
    refreshVisionSources: boolean;
    /**
     * Apply a fade duration to sound refresh workflow
     */
    soundFadeDuration: boolean;
}
