import { ElevatedPoint } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import {
    CanvasBackgroundAlterationEffects,
    CanvasColorationEffects,
    CanvasDarknessEffects,
    CanvasIlluminationEffects,
} from "../layers/_module.mjs";
import { AmbientLight, Token } from "../placeables/_module.mjs";
import type { PointDarknessSource, PointLightSource, PointVisionSource } from "../sources/_module.mjs";
import CanvasGroupMixin from "./canvas-group-mixin.mjs";

/**
 * A container group which contains visual effects rendered above the primary group.
 *
 * ### Hook Events
 * - {@link hookEvents.drawEffectsCanvasGroup}
 * - {@link hookEvents.createEffectsCanvasGroup}
 * - {@link hookEvents.lightingRefresh}
 */
export default class EffectsCanvasGroup<
    TObject extends AmbientLight | Token = AmbientLight | Token,
> extends CanvasGroupMixin(PIXI.Container) {
    /**
     *  Whether to currently animate light sources.
     */
    animateLightSources: boolean;

    /**
     *  Whether to currently animate vision sources.
     */
    animateVisionSources: boolean;

    /**
     * A mapping of light sources which are active within the rendered Scene.
     */
    lightSources: Collection<string, PointLightSource<TObject>>;

    /**
     * A mapping of darkness sources which are active within the rendered Scene.
     */
    darknessSources: Collection<string, PointDarknessSource<TObject>>;

    /**
     * A Collection of vision sources which are currently active within the rendered Scene.
     */
    visionSources: Collection<string, PointVisionSource<TObject>>;

    /**
     *  A set of vision mask filters used in visual effects group
     */
    visualEffectsMaskingFilters: Set<PIXI.Filter>;

    /**
     * A layer of background alteration effects which change the appearance of the primary group render texture.
     */
    background: CanvasBackgroundAlterationEffects;

    /**
     * A layer which adds illumination-based effects to the scene.
     */
    illumination: CanvasIlluminationEffects;

    /**
     * A layer which adds color-based effects to the scene.
     */
    coloration: CanvasColorationEffects;

    /**
     * A layer which adds darkness effects to the scene
     */
    darkness: CanvasDarknessEffects;

    /**
     * Iterator for all light and darkness sources.
     */
    allSources(): Generator<PointDarknessSource<TObject> | PointLightSource<TObject>, void, void>;

    protected override _createLayers(): {
        background: CanvasBackgroundAlterationEffects;
        illumination: CanvasIlluminationEffects;
        coloration: CanvasColorationEffects;
        darkness: CanvasDarknessEffects;
    };

    /**
     * Clear all effects containers and animated sources.
     */
    clearEffects(): void;

    protected override _draw(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Perception Management Methods               */
    /* -------------------------------------------- */

    /**
     *  Initialize LightSource objects for all AmbientLightDocument instances that exist within the active Scene.
     */
    initializeLightSources(): void;

    /**
     * Initialize all sources that generate edges (Darkness and certain Light sources).
     * Darkness sources always generate edges. Light sources only do so if their priority is strictly greater than 0.
     * The `edgesSources` array will be rebuilt and sorted by descending priority, in the case of a tie,
     * DarknessSources take precedence. Otherwise, the existing array is used as-is.
     * Regardless of whether the array is rebuilt, each source is re-initialized to ensure their geometry is refreshed.
     */
    initializePriorityLightSources(): void;

    /**
     *  Refresh the state and uniforms of all LightSource objects.
     */
    refreshLightSources(): void;

    /**
     *  Refresh the state and uniforms of all LightSource objects.
     */
    refreshVisionSources(): void;

    /**
     * Refresh the active display of lighting.
     */
    refreshLighting(): void;

    /**
     * Test whether the point is inside light.
     * @param position The point.
     * @param elevation The elevation of the point.
     * @param options.condition Optional condition a source must satisfy in
     * order to be tested.
     * @returns Is inside light?
     */
    testInsideLight(position: ElevatedPoint, options?: (source: PointLightSource<TObject>) => boolean): boolean;

    /**
     * Test whether the point is inside darkness.
     * @param position      The point.
     * @param elevation     The elevation of the point.
     * @param options.condition Optional condition a source must satisfy in order to be tested.
     * @returns Is inside a darkness?
     */
    testInsideDarkness(position: ElevatedPoint, options?: (source: PointDarknessSource<TObject>) => boolean): boolean;

    /**
     * Get the darkness level at the given point.
     * @param point The point.
     * @returns The darkness level.
     */
    getDarknessLevel(point: ElevatedPoint): number;

    protected override _tearDown(options: object): Promise<void>;

    /**
     * Activate vision masking for visual effects
     * @param enabled Whether to enable or disable vision masking
     */
    toggleMaskingFilters(enabled?: boolean): void;

    /**
     * Activate post-processing effects for a certain effects channel.
     * @param filterMode The filter mode to target.
     * @param postProcessingModes The post-processing modes to apply to this filter.
     * @param uniforms The uniforms to update.
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
