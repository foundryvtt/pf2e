declare interface LightChannel {
    hex: number;
    rgb: number[];
}

declare interface LightChannels {
    black: LightChannel;
    dark: LightChannel;
    dim: LightChannel;
    bright: LightChannel;
}

/**
 * The Lighting Layer which displays darkness and light within the rendered Scene.
 * Lighting Layer (Container)
 *   Illumination Container [MULTIPLY]
 *     Background (Graphics)
 *     Light (Container) [LOS Mask]
 *       Source 1, ..., Source N (Container)
 *     Darkness (Container)
 *       Source 1, ..., Source N (Container)
 *   Coloration Container [ADD_NPM]
 *
 * @example <caption>The lightingRefresh hook</caption>
 * Hooks.on("lightingRefresh", layer => {});
 */
declare class LightingLayer extends PlaceablesLayer<AmbientLight> {
    constructor(document: AmbientLightDocument);

    /** A mapping of light sources which are active within the rendered Scene */
    sources: foundry.utils.Collection<PointSource>;

    /**
     * Increment this whenever lighting channels are re-configured.
     * This informs lighting and vision sources whether they need to re-render.
     */
    version: number;

    /** The currently displayed darkness level, which may override the saved Scene value */
    darknessLevel: number | null;

    /** The current client setting for whether global illumination is used or not */
    globalLight: boolean;

    /** The coloration container which visualizes the effect of light sources */
    coloration: PIXI.Container | null;

    /** The illumination container which visualizes darkness and light */
    illumination: PIXI.Container | null;

    /** A flag for whether the darkness level is currently animating */
    protected _animating: boolean;

    /** An array of light sources which are currently animated */
    protected _animatedSources: PointSource[];

    /** The blur distance for soft shadows */
    protected _blurDistance: boolean;

    /** A mapping of different light level channels */
    channels: LightChannels;

    static override get layerOptions(): typeof PlaceablesLayer['layerOptions'] & {
        rotatableObjects: true;
        objectClass: AmbientLight;
        quadtree: true;
        sheetClass: LightConfig;
        zIndex: 200;
    };

    /** Configure the lighting channels which are inputs to the ShadowMap */
    protected _configureChannels(darkness?: number | null): LightChannels;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    /**
     * Draw the coloration container which is responsible for rendering the visible hue of a light source.
     * Apply an additive blend to the entire container after each individual light source is blended via screen.
     */
    protected _drawColorationContainer(): PIXI.Container;

    /**
     * Draw the illumination container which is responsible for displaying darkness and light.
     */
    protected _drawIlluminationContainer(): PIXI.Container;

    /** Does this scene currently benefit from global illumination? */
    hasGlobalIllumination(): boolean;

    /**
     * Refresh the active display of the LightingLayer.
     * Update the scene background color, light sources, and darkness sources
     * @param darkness
     */
    refresh(darkness: number): void;

    override tearDown(): Promise<void>;

    /** Activate light source animation for AmbientLight objects within this layer */
    activateAnimation(): void;

    /** Deactivate light source animation for AmbientLight objects within this layer */
    deactivateAnimation(): void;

    /**
     * The ticker handler which manages animation delegation
     * @param dt Delta time
     */
    protected _animateSource(dt: number): void;

    /**
     * Animate a smooth transition of the darkness overlay to a target value.
     * Only begin animating if another animation is not already in progress.
     * @param target   The target darkness level between 0 and 1
     * @param duration The desired animation time in milliseconds. Default is 10 seconds
     * @return A Promise which resolves once the animation is complete
     */
    animateDarkness(target?: number, { duration }?: { duration?: number }): Promise<void>;

    protected override _onDragLeftStart(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onDragLeftMove(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onDragLeftCancel(event: PIXI.InteractionEvent): void;

    protected override _onMouseWheel(event: PIXI.InteractionEvent): void;
}
