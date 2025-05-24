import { PointSourcePolygon, PointSourcePolygonConfig } from "../geometry/_module.mjs";
import VisionMode from "../perception/vision-mode.mjs";
import { AmbientLight, Token } from "../placeables/_module.mjs";
import { AdaptiveLightingShader, AdaptiveVisionShader } from "../rendering/shaders/_module.mjs";
import { PointEffectSource } from "./point-effect-source.mjs";
import RenderedEffectSource, {
    RenderedEffectLayerConfig,
    RenderedEffectSourceData,
    RenderedEffectSourceLayer,
} from "./rendered-effect-source.mjs";

declare const RenderedPointEffectSource: {
    new <TObject extends AmbientLight | Token>(...args: any): RenderedEffectSource<TObject> & PointEffectSource;
} & Omit<typeof RenderedEffectSource, "new"> &
    typeof PointEffectSource;

interface RenderedPointEffectSource<TObject extends AmbientLight | Token>
    extends InstanceType<typeof RenderedPointEffectSource<TObject>> {}

/** A specialized subclass of the PointSource abstraction which is used to control the rendering of vision sources. */
export default class PointVisionSource<
    TObject extends AmbientLight | Token,
> extends RenderedPointEffectSource<TObject> {
    static sourceType: "sight";

    static override _initializeShaderKeys: string[];

    static override _refreshUniformsKeys: string[];

    /** The corresponding lighting levels for dim light. */
    protected static _dimLightingLevel: number;

    /** The corresponding lighting levels for bright light. */
    protected static _brightLightingLevel: number;

    static override EDGE_OFFSET: number;

    static override effectsCollection: "visionSources";

    static override defaultData: RenderedEffectSourceData;

    static override get _layers(): Record<"background" | "coloration" | "illumination", RenderedEffectLayerConfig>;

    /* -------------------------------------------- */
    /*  Vision Source Attributes                    */
    /* -------------------------------------------- */

    /** The vision mode linked to this VisionSource */
    visionMode: VisionMode | null;

    /**
     * The vision mode activation flag for handlers
     */
    _visionModeActivated: boolean;

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

    protected override _configureShaders(): Record<string, typeof AdaptiveLightingShader>;

    protected override _updateColorationUniforms(): void;

    protected override _updateIlluminationUniforms(): void;

    protected override _updateBackgroundUniforms(): void;

    protected override _updateCommonUniforms(shader: AdaptiveLightingShader): void;

    /**
     * Update layer uniforms according to vision mode uniforms, if any.
     * @param shader The shader being updated.
     * @param vmUniforms The targeted layer.
     */
    protected _updateVisionModeUniforms(shader: AdaptiveVisionShader, vmUniforms: unknown[]): void;
}

export interface VisionSourceData extends RenderedEffectSourceData {
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
