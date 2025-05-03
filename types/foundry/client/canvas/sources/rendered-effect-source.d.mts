import Color from "@common/utils/color.mjs";
import PointSourceMesh from "../containers/elements/point-source-mesh.mjs";
import PlaceableObject from "../placeables/placeable-object.mjs";
import {
    AbstractBaseShader,
    AdaptiveBackgroundShader,
    AdaptiveColorationShader,
    AdaptiveDarknessShader,
    AdaptiveIlluminationShader,
    AdaptiveLightingShader,
} from "../rendering/shaders/_module.mjs";
import BaseEffectSource, { BaseEffectSourceData } from "./base-effect-source.mjs";

export interface RenderedEffectSourceData extends BaseEffectSourceData {
    /** An animation configuration for the source */
    animation: object;
    /** A color applied to the rendered effect */
    color: number | null;
    /** An integer seed to synchronize (or de-synchronize) animations */
    seed: number | null;
    /** Is this source a temporary preview? */
    preview: boolean;
}

export interface RenderedEffectSourceAnimationConfig {
    /** The human-readable (localized) label for the animation */
    label?: string;
    /** The animation function that runs every frame */
    animation?: Function;
    /** A custom illumination shader used by this animation */
    illuminationShader?: AdaptiveIlluminationShader;
    /** A custom coloration shader used by this animation */
    colorationShader?: AdaptiveColorationShader;
    /** A custom background shader used by this animation */
    backgroundShader?: AdaptiveBackgroundShader;
    /** A custom darkness shader used by this animation */
    darknessShader?: AdaptiveDarknessShader;
    /** The animation seed */
    seed?: number;
    /** The animation time */
    time?: number;
}

export interface RenderedEffectLayerConfig {
    /** The default shader used by this layer */
    defaultShader: typeof AdaptiveLightingShader;
    /** The blend mode used by this layer */
    blendMode: PIXI.BLEND_MODES;
}

export interface RenderedEffectSourceLayer {
    /** Is this layer actively rendered? */
    active: boolean;
    /** Do uniforms need to be reset? */
    reset: boolean;
    /** Is this layer temporarily suppressed? */
    suppressed: boolean;
    /** The rendered mesh for this layer */
    mesh: PointSourceMesh;
    /** The shader instance used for the layer */
    shader: AdaptiveLightingShader;
}

type LightingLevel = (typeof CONST.LIGHTING_LEVELS)[keyof typeof CONST.LIGHTING_LEVELS];

/**
 * An abstract class which extends the base PointSource to provide common functionality for rendering.
 * This class is extended by both the LightSource and VisionSource subclasses.
 */
export default class RenderedEffectSource<TObject extends PlaceableObject | null> extends BaseEffectSource<TObject> {
    /** Keys of the data object which require shaders to be re-initialized. */
    protected static _initializeShaderKeys: string[];

    /** Keys of the data object which require uniforms to be refreshed. */
    protected static _refreshUniformsKeys: string[];

    /** Layers handled by this rendered source. */
    protected static get _layers(): Record<string, RenderedEffectLayerConfig>;

    /** The offset in pixels applied to create soft edges. */
    static EDGE_OFFSET: number;

    static override defaultData: RenderedEffectSourceData;

    /* -------------------------------------------- */
    /*  Rendered Source Attributes                  */
    /* -------------------------------------------- */

    /** The animation configuration applied to this source */
    animation: RenderedEffectSourceAnimationConfig;

    /** Track the status of rendering layers */
    layers: Record<string, RenderedEffectSourceLayer>;

    /** The color of the source as an RGB vector. */
    colorRGB: [number, number, number] | null;

    /** PIXI Geometry generated to draw meshes. */
    protected _geometry: PIXI.Geometry | null;

    /* -------------------------------------------- */
    /*  Source State                                */
    /* -------------------------------------------- */

    /** Is the rendered source animated? */
    get isAnimated(): boolean;

    /** Has the rendered source at least one active layer? */
    get hasActiveLayer(): boolean;

    /** Is this RenderedEffectSource a temporary preview? */
    get isPreview(): boolean;

    /* -------------------------------------------- */
    /*  Rendered Source Properties                  */
    /* -------------------------------------------- */

    /** A convenience accessor to the background layer mesh. */
    get background(): PointSourceMesh;

    /** A convenience accessor to the coloration layer mesh. */
    get coloration(): PointSourceMesh;

    /** A convenience accessor to the illumination layer mesh. */
    get illumination(): PointSourceMesh;

    /* -------------------------------------------- */
    /*  Rendered Source Initialization              */
    /* -------------------------------------------- */

    override initialize(data?: Partial<RenderedEffectSourceData>, options?: { reset?: boolean }): this;

    /** Decide whether to render soft edges with a blur.  */
    protected _initializeSoftEdges(): void;

    protected _configure(changes: Partial<RenderedEffectSourceData>): void;

    /**
     * Configure which shaders are used for each rendered layer.
     * @returns An object whose keys are layer identifiers and whose values are shader classes.
     */
    protected _configureShaders(): Record<string, typeof AdaptiveLightingShader>;

    /**
     * Specific configuration for a layer.
     * @param layer
     * @param layerId
     */
    protected _configureLayer(layer: RenderedEffectSourceLayer, layerId: string): void;

    /* -------------------------------------------- */

    /**
     * Create the geometry for the source shape that is used in shaders and compute its bounds for culling purpose.
     * Triangulate the form and create buffers.
     */
    protected _updateGeometry(): void;

    /* -------------------------------------------- */
    /*  Rendered Source Canvas Rendering            */
    /* -------------------------------------------- */

    /**
     * Render the containers used to represent this light source within the LightingLayer
     * @returns {Record<string, PIXI.Mesh|null>}
     */
    drawMeshes(): Record<string, PIXI.Mesh | null>;

    /**
     * Create a Mesh for a certain rendered layer of this source.
     * @param layerId The layer key in layers to draw
     * @returns The drawn mesh for this layer, or null if no mesh is required
     */
    protected _drawMesh(layerId: string): Record<string, PIXI.Mesh | null>;

    /* -------------------------------------------- */
    /*  Rendered Source Refresh                     */
    /* -------------------------------------------- */

    protected override _refresh(): void;

    /**
     * Update shader uniforms used by every rendered layer.
     * @param shader
     */
    protected _updateCommonUniforms(shader: AbstractBaseShader): void;

    /** Update shader uniforms used for the background layer. */
    protected _updateBackgroundUniforms(): void;

    /** Update shader uniforms used for the coloration layer. */
    protected _updateColorationUniforms(): void;

    /** Update shader uniforms used for the illumination layer. */
    protected _updateIlluminationUniforms(): void;

    /* -------------------------------------------- */
    /*  Rendered Source Destruction                 */
    /* -------------------------------------------- */

    protected override _destroy(): void;

    /* -------------------------------------------- */
    /*  Animation Functions                         */
    /* -------------------------------------------- */

    /**
     * Animate the PointSource, if an animation is enabled and if it currently has rendered containers.
     * @param dt Delta time.
     */
    animate(dt: number): unknown;

    /**
     * Generic time-based animation used for Rendered Point Sources.
     *  @param dt                     Delta time.
     * @param [options]               Options which affect the time animation
     * @param [options.speed=5]       The animation speed, from 0 to 10
     * @param [options.intensity=5]   The animation intensity, from 1 to 10
     * @param [options.reverse=false] Reverse the animation direction
     */
    animateTime(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;

    /* -------------------------------------------- */
    /*  Static Helper Methods                       */
    /* -------------------------------------------- */

    /**
     * Get corrected level according to level and active vision mode data.
     * @param level The lighting level (one of {@link CONST.LIGHTING_LEVELS})
     * @returns The corrected level.
     */
    static getCorrectedLevel(level: LightingLevel): number;

    /**
     * Get corrected color according to level, dim color, bright color and background color.
     * @param level The lighting level (one of {@link CONST.LIGHTING_LEVELS})
     * @param colorDim
     * @param colorBright
     * @param [colorBackground]
     */
    static getCorrectedColor(level: LightingLevel, colorDim: Color, colorBright: Color, colorBackground?: Color): Color;
}
