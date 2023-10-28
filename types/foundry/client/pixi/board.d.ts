export {};

declare global {
    class Canvas<
        TScene extends Scene = Scene,
        TAmbientLight extends AmbientLight<AmbientLightDocument<TScene>> = AmbientLight<AmbientLightDocument<TScene>>,
        TMeasuredTemplate extends MeasuredTemplate<MeasuredTemplateDocument<TScene>> = MeasuredTemplate<
            MeasuredTemplateDocument<TScene>
        >,
        TToken extends Token<TokenDocument<TScene>> = Token<TokenDocument<TScene>>,
        TEffectsCanvasGroup extends EffectsCanvasGroup = EffectsCanvasGroup,
    > {
        /** A perception manager interface for batching lighting, sight, and sound updates */
        perception: PerceptionManager;

        /** A flag to indicate whether a new Scene is currently being drawn. */
        loading: boolean;

        /** A promise that resolves when the canvas is first initialized and ready. */
        initializing: Promise<void> | null;

        /** The current pixel dimensions of the displayed Scene, or null if the Canvas is blank. */
        dimensions: CanvasDimensions;

        /** A set of blur filter instances which are modified by the zoom level and the "soft shadows" setting */
        blurFilters: Set<PIXI.Filter>;

        /**
         * A reference to the MouseInteractionManager that is currently controlling pointer-based interaction, or null.
         */
        currentMouseManager: MouseInteractionManager | null;

        /**
         * Configure options passed to the texture loaded for the Scene.
         * This object can be configured during the canvasInit hook before textures have been loaded.
         */
        loadTexturesOptions: { expireCache: boolean; additionalSources: string[] };

        /**
         * Configure options used by the visibility framework for special effects
         * This object can be configured during the canvasInit hook before visibility is initialized.
         */
        visibilityOptions: { persistentVision: boolean };

        /**
         * Configure options passed to initialize blur for the Scene and override normal behavior.
         * This object can be configured during the canvasInit hook before blur is initialized.
         */
        blurOptions: {
            enabled: boolean;
            blurClass: object;
            strength: number;
            passes: number;
            kernels: number;
        };

        /**
         * Configure the Textures to apply to the Scene.
         * Textures registered here will be automatically loaded as part of the TextureLoader.loadSceneTextures workflow.
         * Textures which need to be loaded should be configured during the "canvasInit" hook.
         */
        sceneTextures: {
            background?: PIXI.Texture;
            foreground?: PIXI.Texture;
            fogOverlay?: PIXI.Texture;
        };

        /** Record framerate performance data. */
        fps: {
            average: number;
            values: number[];
            render: number;
            element: HTMLElement | null;
        };

        /** The singleton interaction manager instance which handles mouse interaction on the Canvas. */
        mouseInteractionManager: MouseInteractionManager;

        /** Configured performance settings which affect the behavior of the Canvas and its renderer. */
        performance: CanvasPerformanceSettings;

        /** A list of supported webGL capabilities and limitations. */
        supported: CanvasSupportedComponents;

        /** Is the photosensitive mode enabled? */
        photosensitiveMode: boolean;

        /** The renderer screen dimensions. */
        screenDimensions: [number, number];

        /* -------------------------------------------- */
        /*  Canvas Groups and Layers                    */
        /* -------------------------------------------- */

        /** The singleton PIXI.Application instance rendered on the Canvas. */
        app: PIXI.Application;

        /** The primary stage container of the PIXI.Application. */
        stage: PIXI.Container;

        /**
         * The primary Canvas group which generally contains tangible physical objects which exist within the Scene.
         * This group is a {@link CachedContainer} which is rendered to the Scene as a {@link SpriteMesh}.
         * This allows the rendered result of the Primary Canvas Group to be affected by a {@link BaseSamplerShader}.
         */
        primary: PrimaryCanvasGroup;

        /**
         * The effects Canvas group which modifies the result of the {@link PrimaryCanvasGroup} by adding special effects.
         * This includes lighting, weather, vision, and other visual effects which modify the appearance of the Scene.
         */
        effects: TEffectsCanvasGroup;

        /**
         * The interface Canvas group which is rendered above other groups and contains all interactive elements.
         * The various {@link InteractionLayer} instances of the interface group provide different control sets for
         * interacting with different types of {@link Document}s which can be represented on the Canvas.
         */
        interface: InterfaceCanvasGroup;

        /** The overlay Canvas group which is rendered above other groups and contains elements not bound to stage transform. */
        overlay: object;

        /** The singleton HeadsUpDisplay container which overlays HTML rendering on top of this Canvas. */
        hud: HeadsUpDisplay;

        /** Position of the mouse on stage. */
        mousePosition: PIXI.Point;

        // Layers
        controls: ControlsLayer;
        drawings: DrawingsLayer;
        grid: GridLayer;
        lighting: TAmbientLight["layer"];
        notes: NotesLayer;
        sounds: SoundsLayer;
        templates: TMeasuredTemplate["layer"];
        tiles: Tile["layer"];
        tokens: TToken["layer"];
        walls: WallsLayer;

        constructor();

        /* -------------------------------------------- */
        /*  Properties and Attributes                   */
        /* -------------------------------------------- */

        /** A flag for whether the game Canvas is initialized and ready for drawing. */
        get initialized(): boolean;

        /** A reference to the currently displayed Scene document, or null if the Canvas is currently blank. */
        get scene(): TScene | null;

        /** A flag for whether the game Canvas is ready to be used. False if the canvas is not yet drawn, true otherwise. */
        get ready(): boolean;

        /** The fog of war bound to this canvas */
        get fog(): object;

        /** The color manager class bound to this canvas */
        get colorManager(): CanvasColorManager;

        /** The colors bound to this scene and handled by the color manager. */
        get colors(): CanvasColorManager["colors"];

        /** Shortcut to get the masks container from HiddenCanvasGroup. */
        get masks(): PIXI.Container;

        /** The id of the currently displayed Scene. */
        get id(): string | null;

        /** The pixel radius of blur distance that should be applied for the current zoom level */
        blurDistance: number;

        /** A mapping of named CanvasLayer classes which defines the layers which comprise the Scene. */
        static get layers(): Record<string, CanvasLayer>;

        /** An Array of all CanvasLayer instances which are active on the Canvas board */
        get layers(): CanvasLayer[];

        /** The currently displayed darkness level, which may override the saved Scene value. */
        get darknessLevel(): number;

        /** Return a reference to the active Canvas Layer */
        get activeLayer(): CanvasLayer | null;

        /* -------------------------------------------- */
        /*  Initialization                              */
        /* -------------------------------------------- */

        /**
         * Initialize the Canvas by creating the HTML element and PIXI application.
         * This step should only ever be performed once per client session.
         * Subsequent requests to reset the canvas should go through Canvas#draw
         */
        initialize(): void;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /**
         * Draw the game canvas.
         * @param [scene] A specific Scene document to render on the Canvas
         * @returns A Promise which resolves once the Canvas is fully drawn
         */
        draw(scene?: TScene | undefined): Promise<this>;

        /** When re-drawing the canvas, first tear down or discontinue some existing processes */
        tearDown(): Promise<void>;

        /**
         * Get the value of a GL parameter
         * @param parameter The GL parameter to retrieve
         * @returns The GL parameter value
         */
        getGLParameter(parameter: string): unknown;

        /**
         * Initialize the starting view of the canvas stage
         * If we are re-drawing a scene which was previously rendered, restore the prior view position
         * Otherwise set the view to the top-left corner of the scene at standard scale
         */
        initializeCanvasPosition(): void;

        /** Event handler for the drop portion of a drag-and-drop event. */
        protected _onDrop(event: DragEvent): void;

        /** Given an embedded object name, get the canvas layer for that object */
        getLayerByEmbeddedName(embeddedName: string): PlaceablesLayer | null;

        /**
         * Get the InteractionLayer of the canvas which manages Documents of a certain collection within the Scene.
         * @param collectionName The collection name
         * @returns The canvas layer
         */
        getCollectionLayer(collectionName: string): PlaceablesLayer | undefined;

        /**
         * Get the canvas active dimensions based on the size of the scene's map.
         * We expand the image size by a factor of 1.5 and round to the nearest 2x grid size.
         * The rounding accomplishes that the padding buffer around the map always contains whole grid spaces.
         * @see {@link documents.BaseScene.getDimensions}
         * @param dimensions The scene dimensions data being established
         */
        static getDimensions(dimensions: GetDimensionsParams): SceneDimensions;

        /** Configure performance settings for hte canvas application based on the selected performance mode */
        protected _configurePerformanceMode(): CanvasPerformanceSettings;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /** Activate framerate tracking by adding an HTML element to the display and refreshing it every frame. */
        activateFPSMeter(): void;

        /** Deactivate framerate tracking by canceling ticker updates and removing the HTML element. */
        deactivateFPSMeter(): void;

        /**
         * Pan the canvas to a certain {x,y} coordinate and a certain zoom level
         * @param x     The x-coordinate of the pan destination
         * @param y     The y-coordinate of the pan destination
         * @param scale The zoom level (max of CONFIG.Canvas.maxZoom) of the action
         */
        pan({ x, y, scale }?: { x?: number | null; y?: number | null; scale?: number | null }): void;

        /**
         * Animate panning the canvas to a certain destination coordinate and zoom scale
         * Customize the animation speed with additional options
         * Returns a Promise which is resolved once the animation has completed
         *
         * @param view The desired view parameters
         * @param [view.x]            The destination x-coordinate
         * @param [view.y]            The destination y-coordinate
         * @param [view.scale]        The destination zoom scale
         * @param [view.duration=250] The total duration of the animation in milliseconds; used if speed is not set
         * @param [view.speed]        The speed of animation in pixels per second; overrides duration if set
         * @returns A Promise which resolves once the animation has been completed
         */
        animatePan(view?: { x?: number; y?: number; scale?: number; duration?: number }): Promise<void>;

        /**
         * Recenter the canvas
         * Otherwise, pan the stage to put the top-left corner of the map in the top-left corner of the window
         * @returns A Promise which resolves once the animation has been completed
         */
        recenter(coordinates: [number, number]): Promise<void>;

        /** Highlight objects on any layers which are visible */
        highlightObjects(active: number): void;

        /**
         * Get the constrained zoom scale parameter which is allowed by the maxZoom parameter
         * @param x     The requested x-coordinate
         * @param y     The requested y-coordinate
         * @param scale The requested scale
         * @return The allowed scale
         */
        protected _constrainView({ x, y, scale }: { x: number; y: number; scale: number }): {
            x: number;
            y: number;
            scale: number;
        };

        /**
         * Displays a Ping both locally and on other connected client, following these rules:
         * 1) Displays on the current canvas Scene
         * 2) If ALT is held, becomes an ALERT ping
         * 3) Else if the user is GM and SHIFT is held, becomes a PULL ping
         * 4) Else is a PULSE ping
         * @param origin  Point to display Ping at
         * @param options Additional options to configure how the ping is drawn.
         */
        ping(origin: Point, options: Record<string, unknown>): Promise<boolean>;

        /**
         * Create a BlurFilter instance and register it to the array for updates when the zoom level changes.
         * @param blurStrength The desired blur strength to use for this filter
         */
        createBlurFilter(blurStrength?: number): PIXI.BlurFilter;

        /**
         * Add a filter to the blur filter list. The filter must have the blur property
         * @param filter The Filter instance to add
         * @returns The added filter for method chaining
         */
        addBlurFilter(filter: PIXI.BlurFilter): PIXI.BlurFilter | void;

        /**
         * Update the blur strength depending on the scale of the canvas stage.
         * This number is zero if "soft shadows" are disabled
         * @param strength Optional blur strength to apply
         */
        updateBlur(strength?: Number | undefined): void;

        /**
         * Convert canvas co-ordinates to the client's viewport.
         * @param origin The canvas coordinates.
         * @returns The corresponding co-ordinates relative to the client's viewport.
         */
        clientCoordinatesFromCanvas(origin: Point): Point;

        /**
         * Convert client viewport co-ordinates to canvas co-ordinates.
         * @param origin The client coordinates.
         * @returns The corresponding canvas co-ordinates.
         */
        canvasCoordinatesFromClient(origin: Point): Point;

        /**
         * Determine whether given canvas co-ordinates are off-screen.
         * @param position The canvas co-ordinates.
         * @returns Is the coordinate outside the screen bounds?
         */
        isOffscreen(position: Point): boolean;

        /**
         * Remove all children of the display object and call one cleaning method:
         * clean first, then tearDown, and destroy if no cleaning method is found.
         * @param displayObject   The display object to clean.
         * @param [destroy]       If textures should be destroyed.
         */
        static clearContainer(displayObject: PIXI.DisplayObject, destroy?: boolean): void;

        /**
         * Get a texture with the required configuration and clear color.
         * @param [options]
         * @param [options.clearColor]           The clear color to use for this texture. Transparent by default.
         * @param [options.textureConfiguration] The render texture configuration.
         */
        static getRenderTexture(options?: { clearColor?: number[]; textureConfiguration?: object }): PIXI.RenderTexture;
    }

    interface CanvasDimensions extends SceneDimensions {
        maxR: number;
        rect: PIXI.Rectangle;
        sceneRect: PIXI.Rectangle;
    }

    type DrawnCanvas<T extends Canvas = Canvas> = {
        [K in keyof T]: NonNullable<T[K]>;
    };
}

interface FoundryRenderer extends PIXI.Renderer {
    plugins: {
        accessibility: PIXI.AccessibilityManager;
        extract: PIXI.Extract;
        particle: PIXI.ParticleRenderer;
        prepare: PIXI.Prepare;
        tilingSprite: PIXI.TilingSpriteRenderer;
    };
}

interface CanvasApplication extends PIXI.Application {
    renderer: FoundryRenderer;
}

interface CanvasPerformanceSettings {
    mode: CanvasPerformanceMode;
    blur: {
        enabled: boolean;
        illumination: boolean;
    };
    mipmap: "ON" | "OFF";
    msaa: boolean;
    fps: number;
    tokenAnimation: boolean;
    lightAnimation: boolean;
    textures: {
        enabled: boolean;
        maxSize: number;
        p2Steps: number;
        p2StepsMax: number;
    };
}

interface CanvasSupportedComponents {
    /** Is WebGL2 supported? */
    webGL2: boolean;
    /** Is reading pixels in RED format supported? */
    readPixelsRED: boolean;
    /** Is the OffscreenCanvas supported? */
    offscreenCanvas: boolean;
}
