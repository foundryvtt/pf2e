export {};

declare global {
    /**
     * A Vision Mode which can be selected for use by a Token.
     * The selected Vision Mode alters the appearance of various aspects of the canvas while that Token is the POV.
     */
    class VisionMode {
        /**
         * Construct a Vision Mode using provided configuration parameters and callback functions.
         * @param data      Data which fulfills the model defined by the VisionMode schema.
         * @param [options] Additional options passed to the DataModel constructor.
         */
        constructor(data?: object, options?: { animated?: boolean });

        id: string;
        label: string;
        tokenConfig: boolean;
        canvas: {
            shader: PIXI.Shader;
            uniforms: object;
        };

        lighting: {
            background: {
                visibility: LightingVisibility;
                postProcessingModes: string[];
                uniforms: object;
            };
            coloration: {
                visibility: LightingVisibility;
                postProcessingModes: string[];
                uniforms: LightingVisibility;
            };
            illumination: {
                visibility: number;
                postProcessingModes: string[];
                uniforms: object;
            };
            levels: { [K in keyof typeof VisionMode.LIGHTING_LEVELS]?: (typeof VisionMode.LIGHTING_LEVELS)[K] };
            multipliers: { [K in keyof typeof VisionMode.LIGHTING_LEVELS]?: (typeof VisionMode.LIGHTING_LEVELS)[K] };
        };

        vision: {
            background: { shader: PIXI.Shader; uniforms: object };
            coloration: { shader: PIXI.Shader; uniforms: object };
            illumination: { shader: PIXI.Shader; uniforms: object };
            darkness: {
                adaptive: boolean;
            };
            defaults: Partial<
                Pick<
                    TokenDocument<Scene | null>["sight"],
                    "attenuation" | "brightness" | "saturation" | "contrast" | "range"
                >
            >;
        };

        /** The lighting illumination levels which are supported. */
        static LIGHTING_LEVELS: {
            DARKNESS: -2;
            HALFDARK: -1;
            UNLIT: 0;
            DIM: 1;
            BRIGHT: 2;
            BRIGHTEST: 3;
        };

        /**
         * Flags for how each lighting channel should be rendered for the currently active vision modes:
         * - Disabled: this lighting layer is not rendered, the shaders does not decide.
         * - Enabled: this lighting layer is rendered normally, and the shaders can choose if they should be rendered or not.
         * - Required: the lighting layer is rendered, the shaders does not decide.
         */
        static LIGHTING_VISIBILITY: {
            DISABLED: 0;
            ENABLED: 1;
            REQUIRED: 2;
        };

        /** A flag for whether this vision source is animated */
        animated: boolean;

        /**
         * Special handling which is needed when this Vision Mode is activated for a VisionSource.
         * @param source Activate this VisionMode for a specific source
         */
        activate(source: VisionSource<Token>): void;

        /**
         * An animation function which runs every frame while this Vision Mode is active.
         * @param dt The deltaTime passed by the PIXI Ticker
         */
        animate(dt: number): Promise<void>;

        /**
         * Special handling which is needed when this Vision Mode is deactivated for a VisionSource.
         * @param source Deactivate this VisionMode for a specific source
         */
        deactivate(source: VisionSource<Token>): void;
    }

    type LightingVisibility = (typeof VisionMode.LIGHTING_VISIBILITY)[keyof typeof VisionMode.LIGHTING_VISIBILITY];
}
