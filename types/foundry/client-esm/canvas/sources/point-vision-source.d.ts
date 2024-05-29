import type { PointRenderedEffectSource } from "./point-effect-source-mixes.d.ts";
import type { RenderedEffectSourceData, RenderedEffectSourceLayer } from "./rendered-effect-source.d.ts";

/** A specialized subclass of the PointSource abstraction which is used to control the rendering of vision sources. */
export default class PointVisionSource<
    TObject extends Token | null = Token | null,
> extends PointRenderedEffectSource<TObject> {
    static sourceType: "sight";

    protected static override _initializeShaderKeys: string[];

    protected static override _refreshUniformsKeys: string[];

    /** The corresponding lighting levels for dim light. */
    protected static _dimLightingLevel: number;

    /** The corresponding lighting levels for bright light. */
    protected static _brightLightingLevel: number;

    static override EDGE_OFFSET: number;

    /* -------------------------------------------- */
    /*  Vision Source Attributes                    */
    /* -------------------------------------------- */

    /** The object of data which configures how the source is rendered */
    data: VisionSourceData;

    /** The vision mode linked to this VisionSource */
    visionMode: VisionMode | null;

    /** The unconstrained LOS polygon. */
    los: PointSourcePolygon;

    /** THe polygon of light perception. */
    light: PointSourcePolygon;

    /** An alias for the shape of the vision source. */
    get fov(): PointSourcePolygon | PIXI.Polygon;

    /** If this vision source background is rendered into the lighting container. */
    get preferred(): boolean;

    /** Is the rendered source animated? */
    override get isAnimated(): boolean;

    /** Light perception radius of this vision source, taking into account if the source is blinded. */
    get lightRadius(): number;

    get radius(): number;

    /* -------------------------------------------- */
    /*  Point Vision Source Blinded Management      */
    /* -------------------------------------------- */

    /** Is this source temporarily blinded? */
    get isBlinded(): boolean;

    /**
     * Records of blinding strings with a boolean value.
     * If any of this record is true, the source is blinded.
     */
    blinded: Record<string, boolean>;

    /** Data overrides that could happen with blindness vision mode. */
    visionModeOverrides: object;

    /* -------------------------------------------- */
    /*  Vision Source Initialization                */
    /* -------------------------------------------- */

    protected override _initialize(data: Partial<VisionSourceData>): void;

    protected override _createShapes(): void;

    /** Responsible for assigning the Vision Mode and calling the activation and deactivation handlers. */
    protected _updateVisionMode(): void;

    protected override _configure(changes: object): void;

    protected override _configureLayer(layer: RenderedEffectSourceLayer, layerId: string): void;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /**
     * Creates the polygon that represents light perception.
     * If the light perception radius is unconstrained, no new polygon instance is created;
     * instead the LOS polygon of this vision source is returned.
     */
    protected _createLightPolygon(): PointSourcePolygon;

    /**
     * Create a restricted FOV polygon by limiting the radius of the unrestricted LOS polygon.
     * If the vision radius is unconstrained, no new polygon instance is created;
     * instead the LOS polygon of this vision source is returned.
     */
    protected _createRestrictedPolygon(): PointSourcePolygon;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    /** Update shader uniforms by providing data from this VisionSource. */
    protected _updateColorationUniforms(): void;

    /** Update shader uniforms by providing data from this VisionSource. */
    protected _updateIlluminationUniforms(): void;

    /**
     * Update layer uniforms according to vision mode uniforms, if any.
     * @param {AdaptiveVisionShader} shader        The shader being updated.
     * @param {Array} vmUniforms                   The targeted layer.
     * @protected
     */
    protected _updateVisionModeUniforms(shader: AdaptiveVisionShader, vmUniforms: unknown[]): void;
}

declare interface VisionSourceData extends RenderedEffectSourceData {
    /** The amount of contrast */
    contrast: number;
    /** Strength of the attenuation between bright, dim, and dark */
    attenuation: number;
    /** The amount of color saturation */
    saturation: number;
    /** The vision brightness. */
    brightness: number;
    /** The vision mode. */
    visionMode: string;
    /** Is this vision source blinded? */
    blinded: boolean;
}
