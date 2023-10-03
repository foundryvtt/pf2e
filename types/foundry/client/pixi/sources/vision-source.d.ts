/** A specialized subclass of the PointSource abstraction which is used to control the rendering of vision sources. */
declare class VisionSource<TObject extends Token | null = Token | null> extends RenderedPointSource<TObject> {
    static sourceType: "sight";

    protected static override _initializeShaderKeys: string[];

    protected static override _refreshUniformsKeys: string[];

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

    /* -------------------------------------------- */
    /*  Vision Source Attributes                    */
    /* -------------------------------------------- */

    /** An alias for the shape of the vision source. */
    get fov(): PointSourcePolygon | PIXI.Polygon;

    /** If this vision source background is rendered into the lighting container. */
    get preferred(): boolean;

    override get isAnimated(): boolean;

    /* -------------------------------------------- */
    /*  Vision Source Initialization                */
    /* -------------------------------------------- */

    protected override _initialize(data: Partial<VisionSourceData>): void;

    protected override _configure(changes: object): void;

    protected override _configureLayer(layer: RenderedPointSourceLayer, layerId: string): void;

    /** Responsible for assigning the Vision Mode and handling exceptions based on vision special status. */
    protected _initializeVisionMode(): void;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /** Create a restricted FOV polygon by limiting the radius of the unrestricted LOS polygon. */
    protected _createRestrictedPolygon(): PointSourcePolygon;

    /* -------------------------------------------- */
    /*  Shader Management                           */
    /* -------------------------------------------- */

    /** Update shader uniforms by providing data from this VisionSource. */
    protected _updateColorationUniforms(): void;

    /** Update shader uniforms by providing data from this VisionSource. */
    protected _updateIlluminationUniforms(): void;
}

declare interface VisionSourceData extends RenderedPointSourceData {
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
