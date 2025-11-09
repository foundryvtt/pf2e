import { ParticleEffect } from "@client/canvas/containers/_module.mjs";
import { WeatherShaderEffect } from "@client/canvas/rendering/shaders/_module.mjs";
import FullCanvasObjectMixin from "../../containers/advanced/full-canvas-mixin.mjs";
import WeatherOcclusionMaskFilter from "../../rendering/filters/weather-occlusion-mask.mjs";
import CanvasLayer, { CanvasLayerOptions } from "../base/canvas-layer.mjs";

interface WeatherTerrainMaskConfiguration {
    /** Enable or disable this mask. */
    enabled: boolean;
    /** An RGBA array of channel weights applied to the mask texture. */
    channelWeights: number[];
    /** If the mask should be reversed. */
    reverse?: boolean;
    /** A texture which defines the mask region. */
    texture: PIXI.Texture | PIXI.RenderTexture;
}

interface WeatherOcclusionMaskConfiguration {
    /** Enable or disable this mask. */
    enabled: boolean;
    /** An RGBA array of channel weights applied to the mask texture. */
    channelWeights: number[];
    /** If the mask should be reversed. */
    reverse?: boolean;
    /** A texture which defines the mask region. */
    texture: PIXI.Texture | PIXI.RenderTexture;
}

/**
 * A CanvasLayer for displaying visual effects like weather, transitions, flashes, or more.
 */
export default class WeatherEffects extends FullCanvasObjectMixin(CanvasLayer) {
    constructor();

    /**
     * The container in which effects are added.
     */
    weatherEffects: PIXI.Container;

    /**
     * The container in which suppression meshed are added.
     */
    suppression: PIXI.Container;

    override get hookName(): string;

    static get layerOptions(): CanvasLayerOptions;

    /**
     * Array of weather effects linked to this weather container.
     */
    effects: Map<string, (ParticleEffect | WeatherShaderEffect)[]>;

    /**
     * A default configuration of the terrain mask that is automatically applied to any shader-based weather effects.
     * This configuration is automatically passed to WeatherShaderEffect#configureTerrainMask upon construction.
     */
    terrainMaskConfig: WeatherTerrainMaskConfiguration;

    /**
     * A default configuration of the terrain mask that is automatically applied to any shader-based weather effects.
     * This configuration is automatically passed to WeatherShaderEffect#configureTerrainMask upon construction.
     */
    occlusionMaskConfig: WeatherOcclusionMaskConfiguration;

    /**
     * The inverse occlusion mask filter bound to this container.
     */
    occlusionFilter: WeatherOcclusionMaskFilter;

    /**
     * The elevation of this object.
     * @default Infinity
     */
    get elevation(): number;

    set elevation(value);

    /**
     * A key which resolves ties amongst objects at the same elevation of different layers.
     * @default PrimaryCanvasGroup.SORT_LAYERS.WEATHER
     */
    get sortLayer(): number;

    /**
     * A key which resolves ties amongst objects at the same elevation within the same layer.
     * @default 0
     */
    get sort(): number;

    set sort(value);

    /**
     * A key which resolves ties amongst objects at the same elevation within the same layer and same sort.
     * @default 0
     */
    get zIndex(): number;

    set zIndex(value);

    /* -------------------------------------------- */
    /*  Weather Effect Rendering                    */
    /* -------------------------------------------- */

    protected override _draw(): Promise<void>;

    protected override _tearDown(): Promise<void>;

    /* -------------------------------------------- */
    /*  Weather Effect Management                   */
    /* -------------------------------------------- */

    /**
     * Initialize the weather container from a weather config object.
     * @param weatherEffectsConfig Weather config object (or null/undefined to clear the container).
     */
    initializeEffects(weatherEffectsConfig?: object): void;

    /**
     * Clear the weather container.
     */
    clearEffects(): void;

    /**
     * Set the occlusion uniforms for this weather shader.
     * @param context The shader context
     * @param config Occlusion masking options
     */
    protected static configureOcclusionMask(context: PIXI.Shader, config?: WeatherOcclusionMaskConfiguration): void;

    /**
     * Set the terrain uniforms for this weather shader.
     * @param context The shader context
     * @param config Terrain masking options
     */
    protected static configureTerrainMask(context: PIXI.Shader, config?: WeatherTerrainMaskConfiguration): void;
}
