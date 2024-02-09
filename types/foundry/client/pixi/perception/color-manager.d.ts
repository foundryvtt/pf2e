export {};

declare global {
    /**
     * A singleton class dedicated to manage the color spaces associated with the scene and the canvas.
     * @category - Canvas
     */
    class CanvasColorManager {
        /** Colors exposed by the manager. */
        colors: {
            darkness: foundry.utils.Color;
            halfdark: foundry.utils.Color;
            background: foundry.utils.Color;
            dim: foundry.utils.Color;
            bright: foundry.utils.Color;
            ambientBrightest: foundry.utils.Color;
            ambientDaylight: foundry.utils.Color;
            ambientDarkness: foundry.utils.Color;
            sceneBackground: foundry.utils.Color;
            fogExplored: foundry.utils.Color;
            fogUnexplored: foundry.utils.Color;
        };

        /** Weights used by the manager to compute colors. */
        weights: {
            dark: number;
            halfdark: number;
            dim: number;
            bright: number;
        };

        /** Returns the darkness penalty for the actual scene configuration. */
        get darknessPenalty(): number;

        /** Get the darkness level of this scene. */
        get darknessLevel(): number;

        /**
         * Initialize color space pertaining to a specific scene.
         * @param [colors={}]
         * @param [colors.backgroundColor]    The background canvas color
         * @param [colors.brightestColor]     The brightest ambient color
         * @param [colors.darknessColor]      The color of darkness
         * @param [colors.darknessLevel]      A preview darkness level
         * @param [colors.daylightColor]      The ambient daylight color
         * @param [colors.fogExploredColor]   The color applied to explored areas
         * @param [colors.fogUnexploredColor] The color applied to unexplored areas
         */
        initialize({
            backgroundColor,
            brightestColor,
            darknessColor,
            darknessLevel,
            daylightColor,
            fogExploredColor,
            fogUnexploredColor,
        }?: {
            backgroundColor?: foundry.utils.Color | number | string;
            brightestColor?: foundry.utils.Color | number | string;
            darknessColor?: foundry.utils.Color | number | string;
            darknessLevel?: number;
            daylightColor?: number;
            fogExploredColor?: number;
            fogUnexploredColor?: number;
        }): void;
    }
}
