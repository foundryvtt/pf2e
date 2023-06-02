export {};

declare global {
    class Canvas<
        TScene extends Scene = Scene,
        TAmbientLight extends AmbientLight = AmbientLight,
        TMeasuredTemplate extends MeasuredTemplate = MeasuredTemplate,
        TToken extends Token = Token,
        TEffectsCanvasGroup extends EffectsCanvasGroup = EffectsCanvasGroup
    > {
        constructor();

        /** A reference to the currently displayed Scene document, or null if the Canvas is currently blank. */
        scene: TScene | null;

        /** The current pixel dimensions of the displayed Scene, or null if the Canvas is blank. */
        dimensions: CanvasDimensions | null;

        /** A reference to the HeadsUpDisplay container which overlays HTML rendering on top of this Canvas. */
        hud: HeadsUpDisplay | null;

        /** An Array of pending canvas operations which should trigger on the next re-paint */
        pendingOperations: Record<string, unknown>[];

        /** A perception manager interface for batching lighting, sight, and sound updates */
        perception: PerceptionManager;

        /** A flag for whether the game Canvas is ready to be used. False if the canvas is not yet drawn, true otherwise. */
        ready: boolean;

        /** A flag to indicate whether a new Scene is currently being drawn. */
        loading: boolean;

        /** A flag for whether the game Canvas is initialized and ready for drawing. */
        initialized: boolean;

        /** Track the timestamp of the last stage zoom operation */
        protected _zoomTime: number;

        /** Track the last automatic pan time to throttle */
        protected _panTime: number;

        /** An object of data which is temporarily cached to be reloaded after the canvas is drawn */
        protected _reload: { layer: string };

        /** A Set of unique pending operation names to ensure operations are only performed once */
        protected _pendingOperationNames: Set<string>;

        /** The pixel radius of blur distance that should be applied for the current zoom level */
        blurDistance: number;

        /** An array of blur filter instances which are modified by the zoom level and the "soft shadows" setting */
        blurFilters: InstanceType<(typeof PIXI)["BlurFilter"]>[];

        /** A reference to the MouseInteractionManager that is currently controlling pointer-based interaction, or null. */
        currentMouseManager: MouseInteractionManager | null;

        /** Record framerate performance data */
        fps: {
            values: number[];
            last: number;
            average: number;
            render: number;
            element: HTMLElement;
            fn: Function | null | undefined;
        };

        /** The singleton interaction manager instance which handles mouse workflows on the Canvas */
        mouseInteractionManager: MouseInteractionManager;

        /** The renderer screen dimensions. */
        screenDimensions: [number, number];

        // The following are undocumented
        app: CanvasApplication;
        stage: PIXI.Container;
        protected _dragDrop: DragDrop;
        msk: PIXI.Graphics;
        performance: CanvasPerformanceSettings;

        /**
         * The effects Canvas group which modifies the result of the {@link PrimaryCanvasGroup} by adding special effects.
         * This includes lighting, weather, vision, and other visual effects which modify the appearance of the Scene.
         */
        effects: TEffectsCanvasGroup;

        /**
         * The primary Canvas group which generally contains tangible physical objects which exist within the Scene.
         * This group is a {@link CachedContainer} which is rendered to the Scene as a {@link SpriteMesh}.
         * This allows the rendered result of the Primary Canvas Group to be affected by a {@link BaseSamplerShader}.
         */
        primary: PrimaryCanvasGroup;

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

        interface: InterfaceCanvasGroup;
        /**
         * Initialize the Canvas by creating the HTML element and PIXI application.
         * This step should only ever be performed once per client session.
         * Subsequent requests to reset the canvas should go through Canvas#draw
         */
        initialize(): void;

        /* -------------------------------------------- */
        /*  Properties and Attributes                   */
        /* -------------------------------------------- */

        /** The currently displayed darkness level, which may override the saved Scene value. */
        get darknessLevel(): number;

        /** The id of the currently displayed Scene. */
        get id(): string | null;

        /** The color manager class bound to this canvas */
        get colorManager(): CanvasColorManager;

        /** The colors bound to this scene and handled by the color manager. */
        get colors(): CanvasColorManager["colors"];

        /** A mapping of named CanvasLayer classes which defines the layers which comprise the Scene. */
        static get layers(): Record<string, CanvasLayer>;

        /** An Array of all CanvasLayer instances which are active on the Canvas board */
        get layers(): CanvasLayer[];

        /** Return a reference to the active Canvas Layer */
        get activeLayer(): CanvasLayer | null;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /** Initialize the group containers of the game Canvas. */
        protected _createGroups(): void;

        /** When re-drawing the canvas, first tear down or discontinue some existing processes */
        tearDown(): Promise<void>;

        /** Event handler for the drop portion of a drag-and-drop event. */
        protected _onDrop(event: DragEvent): void;

        /**
         * Draw the game canvas.
         * @param [scene] A specific Scene document to render on the Canvas
         * @return A Promise which resolves once the Canvas is fully drawn
         */
        draw(scene: TScene): Promise<this>;

        /**
         * Get the value of a GL parameter
         * @param parameter The GL parameter to retrieve
         * @returns The returned value type depends of the parameter to retrieve
         */
        getGLParameter(parameter: string): unknown;

        /**
         * Get the canvas active dimensions based on the size of the scene's map.
         * We expand the image size by a factor of 1.5 and round to the nearest 2x grid size.
         * The rounding accomplishes that the padding buffer around the map always contains whole grid spaces.
         * @see {@link documents.BaseScene.getDimensions}
         * @param dimensions The scene dimensions data being established
         */
        static getDimensions(dimensions: GetDimensionsParams): CanvasDimensions;

        /** Configure performance settings for hte canvas application based on the selected performance mode */
        protected _configurePerformanceMode(): CanvasPerformanceSettings;

        /** Once the canvas is drawn, initialize control, visibility, and audio states */
        protected _initialize(): Promise<void>;

        /**
         * Initialize the starting view of the canvas stage
         * If we are re-drawing a scene which was previously rendered, restore the prior view position
         * Otherwise set the view to the top-left corner of the scene at standard scale
         */
        protected _initializeCanvasPosition(): void;

        /** Initialize a CanvasLayer in the activation state */
        protected _initializeCanvasLayer(): void;

        /**
         * Initialize a token or set of tokens which should be controlled.
         * Restore controlled and targeted tokens from before the re-draw.
         */
        protected _initializeTokenControl(): void;

        /** Given an embedded object name, get the canvas layer for that object */
        getLayerByEmbeddedName(embeddedName: string): PlaceablesLayer | null;

        /**
         * Activate a specific CanvasLayer by its canonical name
         * @param layerName The named layer to activate
         */
        activateLayer(layerName: string): void;

        /** Activate framerate tracking by adding an HTML element to the display and refreshing it every frame. */
        activateFPSMeter(): void;

        /** Deactivate framerate tracking by canceling ticker updates and removing the HTML element. */
        deactivateFPSMeter(): void;

        /** Measure average framerate per second over the past 30 frames */
        protected _measureFPS(): void;

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
        animatePan(view?: { x?: number; y?: number; scale?: number; duration?: number }): Promise<unknown>;

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

        /** Create a BlurFilter instance and register it to the array for updates when the zoom level changes. */
        createBlurFilter(): InstanceType<(typeof PIXI)["BlurFilter"]>;

        /**
         * Update the blur strength depending on the scale of the canvas stage.
         * This number is zero if "soft shadows" are disabled
         */
        updateBlur(scale: number): void;
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
