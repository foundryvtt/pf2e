import type {
    GlobalLightSource,
    PointLightSource,
    PointVisionSource,
} from "../../../client-esm/canvas/sources/module.ts";

export {};

declare global {
    /**
     * A container group which contains visual effects rendered above the primary group.
     *
     * ### Hook Events
     * - {@link hookEvents.drawEffectsCanvasGroup}
     * - {@link hookEvents.createEffectsCanvasGroup}
     * - {@link hookEvents.lightingRefresh}
     *
     * @category - Canvas
     */
    class EffectsCanvasGroup extends CanvasGroup {
        constructor();

        /** The current global light source */
        globalLightSource: GlobalLightSource;

        /** Whether to currently animate light sources. */
        animateLightSources: boolean;

        /** Whether to currently animate vision sources. */
        animateVisionSources: boolean;

        /** A mapping of light sources which are active within the rendered Scene. */
        lightSources: Collection<PointLightSource<AmbientLight | Token>>;

        /** A Collection of vision sources which are currently active within the rendered Scene. */
        visionSources: Collection<PointVisionSource<Token>>;

        /** A set of vision mask filters used in visual effects group */
        visualEffectsMaskingFilters: Set<PIXI.Filter>;

        /** A layer of background alteration effects which change the appearance of the primary group render texture. */
        background: CanvasLayer;

        /** A layer which adds illumination-based effects to the scene. */
        illumination: CanvasLayer;

        /** A layer which adds color-based effects to the scene. */
        coloration: CanvasLayer;

        /** A layer which adds darkness effects to the scene */
        darkness: CanvasLayer;

        /** Clear all effects containers and animated sources. */
        clearEffects(): void;

        /** Initialize LightSource objects for all AmbientLightDocument instances that exist within the active Scene. */
        initializeLightSources(): void;

        /** Update the global light source which provide global illumination to the Scene. */
        protected _updateGlobalLightSource(): PointLightSource<null>;

        /** Refresh the state and uniforms of all LightSource objects. */
        refreshLightSources(): void;

        /** Refresh the state and uniforms of all LightSource objects. */
        refreshVisionSources(): void;

        /** Refresh the active display of lighting. */
        refreshLighting(): void;

        /**
         * Test whether the point is inside light.
         * @param position      The point.
         * @param elevation     The elevation of the point.
         * @returns             Is inside light?
         */
        testInsideLight(position: Point, elevation: number): boolean;

        /**
         * Test whether the point is inside darkness.
         * @param position      The point.
         * @param elevation     The elevation of the point.
         * @returns             Is inside a darkness?
         */
        testInsideDarkness(position: Point, elevation: number): boolean;

        /**
         * Activate vision masking for visual effects
         * @param [enabled=true]    Whether to enable or disable vision masking
         */
        toggleMaskingFilters(enabled?: boolean): void;

        /**
         * Activate post-processing effects for a certain effects channel.
         * @param filterMode               The filter mode to target.
         * @param [postProcessingModes=[]] The post-processing modes to apply to this filter.
         * @param [uniforms={}]            The uniforms to update.
         */
        activatePostProcessingFilters(filterMode: string, postProcessingModes?: string[], uniforms?: object): void;

        /** Reset post-processing modes on all Visual Effects masking filters. */
        resetPostProcessingFilters(): void;

        /* -------------------------------------------- */
        /*  Animation Management                        */
        /* -------------------------------------------- */

        /** Activate light source animation for AmbientLight objects within this layer */
        activateAnimation(): void;

        /** Deactivate light source animation for AmbientLight objects within this layer */
        deactivateAnimation(): void;

        /**
         * Animate a smooth transition of the darkness overlay to a target value.
         * Only begin animating if another animation is not already in progress.
         * @param target   The target darkness level between 0 and 1
         * @param duration The desired animation time in milliseconds. Default is 10 seconds
         * @returns A Promise which resolves once the animation is complete
         */
        animateDarkness(target?: number, { duration }?: { duration?: number }): Promise<void>;
    }
}
