export const BLEND_MODES: {
    /**
     * A custom blend mode equation which chooses the maximum color from each channel within the stack.
     */
    MAX_COLOR: [
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.MAX,
        typeof WebGL2RenderingContext.MAX,
    ];

    /**
     * A custom blend mode equation which chooses the minimum color from each channel within the stack.
     */
    MIN_COLOR: [
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.MIN,
        typeof WebGL2RenderingContext.MAX,
    ];

    /**
     * A custom blend mode equation which chooses the minimum color for color channels and min alpha from alpha channel.
     */
    MIN_ALL: [
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.ONE,
        typeof WebGL2RenderingContext.MIN,
        typeof WebGL2RenderingContext.MIN,
    ];
};
