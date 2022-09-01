export {};

declare global {
    /**
     * A singleton class dedicated to manage the color spaces associated with the scene and the canvas.
     * @category - Canvas
     */
    class CanvasColorManager {
        /** Colors exposed by the manager. */
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
            backgroundColor?: Color | number | string;
            brightestColor?: Color | number | string;
            darknessColor?: Color | number | string;
            darknessLevel?: number;
            daylightColor?: number;
            fogExploredColor?: number;
            fogUnexploredColor?: number;
        }): void;
    }
}
