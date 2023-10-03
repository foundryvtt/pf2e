/**
 * An abstract class which extends the base PointSource to provide common functionality for rendering.
 * This class is extended by both the LightSource and VisionSource subclasses.
 */
declare abstract class RenderedPointSource<TObject extends PlaceableObject | null> extends PointSource<TObject> {
    /** Keys of the data object which require shaders to be re-initialized. */
    protected static _initializeShaderKeys: string[];

    /** Keys of the data object which require uniforms to be refreshed. */
    protected static _refreshUniformsKeys: string[];

    /** The offset in pixels applied to create soft edges. */
    static EDGE_OFFSET: number;

    /* -------------------------------------------- */
    /*  Rendered Source Attributes                  */
    /* -------------------------------------------- */

    /** The animation configuration applied to this source */
    animation: RenderedPointSourceAnimationConfig;

    /** The object of data which configures how the source is rendered */
    data: RenderedPointSourceData;

    /** Track the status of rendering layers */
    layers: Record<"background" | "coloration" | "illumination", RenderedPointSourceLayer>;

    /** The color of the source as a RGB vector. */
    colorRGB: [number, number, number] | null;

    /* -------------------------------------------- */
    /*  Rendered Source Properties                  */
    /* -------------------------------------------- */

    /** A convenience accessor to the background layer mesh. */
    get background(): PointSourceMesh;

    /** A convenience accessor to the coloration layer mesh. */
    get coloration(): PointSourceMesh;

    /** A convenience accessor to the illumination layer mesh. */
    get illumination(): PointSourceMesh;

    /** Is the rendered source animated? */
    get isAnimated(): boolean;

    /** Has the rendered source at least one active layer? */
    get hasActiveLayer(): boolean;

    /** Is this RenderedPointSource a temporary preview? */
    get isPreview(): boolean;

    /* -------------------------------------------- */
    /*  Rendered Source Initialization              */
    /* -------------------------------------------- */

    protected override _initialize(data: object): void;

    protected override _configure(changes: object): void;

    /** Decide whether to render soft edges with a blur. */
    protected _configureSoftEdges(): void;

    /**
     * Configure the derived color attributes and associated flag.
     * @param color The color to configure (usually a color coming for the rendered point source data)
     *              or null if no color is configured for this rendered source.
     */
    protected _configureColorAttributes(color: number | null): void;

    /** Specific configuration for a layer. */
    protected _configureLayer(layer: RenderedPointSourceLayer, layerId: string): void;

    /** Initialize the blend mode and vertical sorting of this source relative to others in the container. */
    protected _initializeBlending(): void;

    /* -------------------------------------------- */
    /*  Rendered Source Canvas Rendering            */
    /* -------------------------------------------- */

    /** Render the containers used to represent this light source within the LightingLayer */
    drawMeshes(): Record<"background" | "coloration" | "illumination", PIXI.Mesh>;

    /* -------------------------------------------- */
    /*  Rendered Source Refresh                     */
    /* -------------------------------------------- */

    protected override _refresh(): void;

    protected override _isActive(): boolean;

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
    animate(dt: number): void;

    /**
     * Generic time-based animation used for Rendered Point Sources.
     * @param dt Delta time.
     * @param [options]               Options which affect the time animation
     * @param [options.speed=5]       The animation speed, from 1 to 10
     * @param [options.intensity=5]   The animation intensity, from 1 to 10
     * @param [options.reverse=false] Reverse the animation direction
     */
    animateTime(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;
}

interface RenderedPointSourceData extends PointSourceData {
    /** A color applied to the rendered effect */
    color: number | null;
    /** An integer seed to synchronize (or de-synchronize) animations */
    seed: number | null;
    /** Is this source a temporary preview? */
    preview: boolean;
}

interface RenderedPointSourceAnimationConfig {
    /** The human-readable (localized) label for the animation */
    label?: string;
    /** The animation function that runs every frame */
    animation?: Function;
    /** A custom illumination shader used by this animation */
    illuminationShader?: PIXI.Shader;
    /** A custom coloration shader used by this animation */
    colorationShader?: PIXI.Shader;
    /** A custom background shader used by this animation */
    backgroundShader?: PIXI.Shader;
    /** The animation seed */
    seed?: number;
    /** The animation time */
    time?: number;
}

interface RenderedPointSourceLayer {
    /** Is this layer actively rendered? */
    active: boolean;
    /** Do uniforms need to be reset? */
    reset: boolean;
    /** Is this layer temporarily suppressed? */
    suppressed: boolean;
    /** The rendered mesh for this layer */
    mesh: PointSourceMesh;
    /** The shader instance used for the layer */
    shader: PIXI.Shader;
}
