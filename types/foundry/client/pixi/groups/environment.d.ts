export {};

declare global {
    /**
     * A container group which contains the primary canvas group and the effects canvas group.
     *
     * @category - Canvas
     */
    class EnvironmentCanvasGroup extends CanvasGroup {
        static override groupName: "environment";

        /**
         * Colors exposed by the manager.
         * @enum {Color}
         */
        colors: {
            darkness: Color;
            halfdark: Color;
            background: Color;
            dim: Color;
            bright: Color;
            ambientBrightest: Color;
            ambientDaylight: Color;
            ambientDarkness: Color;
            sceneBackground: Color;
            fogExplored: Color;
            fogUnexplored: Color;
        };

        /**
         * Weights used by the manager to compute colors.
         * @enum {number}
         */
        weights: {
            dark: number;
            halfdark: number;
            dim: number;
            bright: number;
        };

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Get the darkness level of this scene. */
        get darknessLevel(): number;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        override _draw(options: object): Promise<void>;

        /* -------------------------------------------- */
        /*  Ambience Methods                            */
        /* -------------------------------------------- */

        /**
         * Initialize the scene environment options.
         * @param [config={}]
         * @param [config.backgroundColor]              The background canvas color
         * @param [config.brightestColor]               The brightest ambient color
         * @param [config.darknessColor]                The color of darkness
         * @param [config.daylightColor]                The ambient daylight color
         * @param [config.fogExploredColor]             The color applied to explored areas
         * @param [config.fogUnexploredColor]           The color applied to unexplored areas
         * @param [config.environment]                  The scene environment data
         * @fires PIXI.FederatedEvent type: "darknessChange" - event: {environmentData: {darknessLevel, priorDarknessLevel}}
         */
        initialize(config?: EnvironmentInitializeConfig): void;
    }

    type ColorSource = string | number | [number, number, number];

    interface EnvironmentInitializeConfig {
        backgroundColor?: Maybe<ColorSource>;
        brightestColor?: Maybe<ColorSource>;
        darknessColor?: Maybe<ColorSource>;
        daylightColor?: Maybe<ColorSource>;
        fogExploredColor?: Maybe<ColorSource>;
        fogUnexploredColor?: Maybe<ColorSource>;
        environment?: DeepPartial<EnvironmentDataSource>;
    }
}
