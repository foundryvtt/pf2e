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
    class LightingLayer<TObject extends AmbientLight = AmbientLight> extends PlaceablesLayer<TObject> {
        static override documentName: "AmbientLight";

        static override get layerOptions(): PlaceablesLayerOptions;

        override get hookName(): "LightingLayer";

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        protected override _activate(): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /**
         * Actions to take when the darkness level of the Scene is changed
         * @param darkness The new darkness level
         * @param prior    The prior darkness level
         */
        protected _onDarknessChange(darkness: number, prior: number): void;

        protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

        protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

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
