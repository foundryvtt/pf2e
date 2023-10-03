export {};

declare global {
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
    class LightingLayer<TAmbientLight extends AmbientLight = AmbientLight> extends PlaceablesLayer<TAmbientLight> {
        constructor();

        override quadtree: CanvasQuadtree<TAmbientLight>;

        /** A mapping of light sources which are active within the rendered Scene */
        sources: Collection<LightSource<TAmbientLight | Token>>;

        /**
         * Increment this whenever lighting channels are re-configured.
         * This informs lighting and vision sources whether they need to re-render.
         */
        version: number;

        /** The current client setting for whether global illumination is used or not */
        globalLight: boolean;

        /** The coloration container which visualizes the effect of light sources */
        coloration: PIXI.Container | null;

        /** The illumination container which visualizes darkness and light */
        illumination: IlluminationContainer | null;

        /** The background container which visualizes the background */
        background: PIXI.Container | null;

        /** An array of light sources which are currently animated */
        protected _animatedSources: LightSource<TAmbientLight>[];

        /** A mapping of different light level channels */
        channels: LightChannels;

        static override get layerOptions(): (typeof PlaceablesLayer)["layerOptions"] & {
            name: "lighting";
            rotatableObjects: true;
            zIndex: 300;
        };

        /**
         * TODO: Significant portions of this method may no longer be needed
         * Configure the lighting channels which are inputs to the ShadowMap
         * @param [options]
         * @param [options.darkness]        Darkness level override.
         * @param [options.backgroundColor] Canvas background color override.
         */
        protected _configureChannels(options?: { darkness?: number; backgroundColor?: number }): LightChannels;

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
        protected _drawIlluminationContainer(): IlluminationContainer;

        /** Does this scene currently benefit from global illumination? */
        hasGlobalIllumination(): boolean;

        /** Initialize all AmbientLight sources which are present on this layer */
        initializeSources(): void;

        /**
         * Refresh the active display of the LightingLayer.
         * Update the scene background color, light sources, and darkness sources
         * @param [options]
         * @param [options.darkness]        An override darkness level to which the layer should be temporarily rendered.
         * @param [options.backgroundColor] An override canvas background color.
         */
        refresh(options?: { darkness?: number | null; backgroundColor?: string }): void;

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

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /**
         * Actions to take when the darkness level of the Scene is changed
         * @param darkness The new darkness level
         * @param prior    The prior darkness level
         */
        protected _onDarknessChange(darkness: number, prior: number): void;

        protected override _onDragLeftStart(event: PIXI.FederatedEvent): Promise<void>;

        protected override _onDragLeftMove(event: PIXI.FederatedEvent): Promise<void>;

        protected override _onDragLeftCancel(event: PIXI.FederatedEvent): void;

        protected override _onMouseWheel(event: WheelEvent): void;
    }

    interface IlluminationContainer extends PIXI.Container {
        primary: PIXI.Container;
        background: PIXI.Graphics;
        filter: InstanceType<typeof PIXI.AlphaFilter> | InstanceType<typeof PIXI.BlurFilter>;
        lights: PIXI.Container;
    }

    interface LightChannel {
        hex: number;
        rgb: number[];
    }

    interface LightChannels {
        background: LightChannel;
        black: LightChannel;
        bright: LightChannel;
        canvas: LightChannel;
        dark: LightChannel;
        darkness: {
            level: number;
            rgb: [number, number, number];
        };
        dim: LightChannel;
    }
}
