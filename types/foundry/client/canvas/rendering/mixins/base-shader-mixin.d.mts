/**
 * A mixin which decorates a PIXI.Filter or PIXI.Shader with common properties.
 * @category Mixins
 * @param Shader The parent ShaderClass class being mixed.
 */
export default function BaseShaderMixin<TShader extends typeof PIXI.Filter | typeof PIXI.Shader>(
    Shader: TShader,
): {
    new (
        program: PIXI.Program,
        uniforms?: PIXI.utils.Dict<any>,
    ): {
        program: PIXI.Program;
        uniformGroup: PIXI.UniformGroup;
        uniformBindCount: number;
        disposeRunner: PIXI.Runner;
        checkUniformExists(name: string, group: PIXI.UniformGroup): boolean;
        destroy(): void;
        readonly uniforms: PIXI.utils.Dict<any>;
    } & InstanceType<TShader>;

    /**
     * Useful constant values computed at compile time
     */
    CONSTANTS: string;

    /**
     * Fast approximate perceived brightness computation
     * Using Digital ITU BT.709 : Exact luminance factors
     */
    PERCEIVED_BRIGHTNESS: string;

    /**
     * Convertion functions for sRGB and Linear RGB.
     */
    COLOR_SPACES: string;

    /**
     * Fractional Brownian Motion for a given number of octaves
     */
    FBM(octaves?: number, amp?: number): string;

    /**
     * High Quality Fractional Brownian Motion
     */
    FBMHQ(octaves?: number): string;

    /**
     * Angular constraint working with coordinates on the range [-1, 1]
     * => coord: Coordinates
     * => angle: Angle in radians
     * => smoothness: Smoothness of the pie
     * => l: Length of the pie.
     */
    PIE: string;

    /**
     * A conventional pseudo-random number generator with the "golden" numbers, based on uv position
     */
    PRNG_LEGACY: string;

    /**
     * A pseudo-random number generator based on uv position which does not use cos/sin
     * This PRNG replaces the old PRNG_LEGACY to workaround some driver bugs
     */
    PRNG: string;

    /**
     * A Vec2 pseudo-random generator, based on uv position
     */
    PRNG2D: string;

    /**
     * A Vec3 pseudo-random generator, based on uv position
     */
    PRNG3D: string;

    /**
     * A conventional noise generator
     */
    NOISE: string;

    /**
     * Convert a Hue-Saturation-Brightness color to RGB - useful to convert polar coordinates to RGB
     */
    HSB2RGB: string;

    /**
     * Declare a wave function in a shader -> wcos (default), wsin or wtan.
     * Wave on the [v1,v2] range with amplitude -> a and speed -> speed.
     * @param the math function to use
     */
    WAVE(func?: string | undefined): string;

    /**
     * Rotation function.
     */
    ROTATION: string;

    /**
     * Voronoi noise function. Needs PRNG2D and CONSTANTS.
     * @see PRNG2D
     * @see CONSTANTS
     */
    VORONOI: string;

    /**
     * Enables GLSL 1.0 backwards compatibility in GLSL 3.00 ES vertex shaders.
     */
    GLSL1_COMPATIBILITY_VERTEX: string;

    /**
     * Enables GLSL 1.0 backwards compatibility in GLSL 3.00 ES fragment shaders.
     */
    GLSL1_COMPATIBILITY_FRAGMENT: string;

    from(vertexSrc?: string, fragmentSrc?: string, uniforms?: PIXI.utils.Dict<any>): TShader;
};
