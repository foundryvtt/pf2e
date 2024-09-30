export {};

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

declare global {
    /** A filter specialized for transition effects between a source object and a target texture. */
    class TextureTransitionFilter extends AbstractBaseFilter {
        /** Transition types for this shader. */
        static get TYPES(): {
            FADE: "fade";
            SWIRL: "swirl";
            WATER_DROP: "waterDrop";
            MORPH: "morph";
            CROSSHATCH: "crosshatch";
            WIND: "wind";
            WAVES: "waves";
            WHITE_NOISE: "whiteNoise";
            HOLOGRAM: "hologram";
            HOLE: "hole";
            HOLE_SWIRL: "holeSwirl";
            GLITCH: "glitch";
            DOTS: "dots";
        };

        /**
         * The transition type (see {@link TextureTransitionFilter.TYPES}).
         * @type {string}
         * @defaultValue TextureTransitionFilter.TYPES.FADE
         */
        get type(): TextureTransitionType;

        set type(type: TextureTransitionType);

        /** Sampler target for this filter. */
        set targetTexture(targetTexture: PIXI.Texture);

        /**
         * Animate a transition from a subject SpriteMesh/PIXI.Sprite to a given texture.
         * @param subject   The source mesh/sprite to apply a transition.
         * @param texture   The target texture.
         * @param [options]
         * @param [options.type=TYPES.FADE] The transition type (default to FADE.)
         * @param [options.name]            The name of the {@link CanvasAnimation}.
         * @param [options.duration=1000]   The animation duration
         * @param [options.easing]          The easing function of the animation
         * @returns A Promise which resolves to true once the animation has concluded or false if the animation was
         *          prematurely terminated
         */
        static animate(
            subject: PIXI.Sprite | SpriteMesh,
            texture: PIXI.Texture,
            options?: {
                type?: TextureTransitionType;
                name?: string | symbol;
                duration?: number;
                easing?: Function | string;
            },
        ): Promise<boolean>;

        static override defaultUniforms: Record<string, unknown>;

        static override vertexShader: string;

        static override fragmentShader: string;

        override apply(
            filterManager: PIXI.FilterSystem,
            input: PIXI.RenderTexture,
            output: PIXI.RenderTexture,
            clearMode?: PIXI.CLEAR_MODES,
            _currentState?: PIXI.FilterState,
        ): void;
    }

    type TextureTransitionType = (typeof TextureTransitionFilter.TYPES)[keyof typeof TextureTransitionFilter.TYPES];
}
