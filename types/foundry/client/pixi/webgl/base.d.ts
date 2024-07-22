export {};

declare global {
    /**
     * A mixin which decorates a PIXI.Filter or PIXI.Shader with common properties.
     * @category - Mixins
     * @param ShaderClass The parent ShaderClass class being mixed.
     * @returns A Shader/Filter subclass mixed with BaseShaderMixin features.
     */
    interface BaseShaderMixin<TBase extends PIXI.Shader> {
        new (program: string, uniforms: object): TBase;

        /** Common attributes for vertex shaders. */
        VERTEX_ATTRIBUTES: string;

        /** Common uniforms for vertex shaders. */
        VERTEX_UNIFORMS: string;

        /** Common varyings shared by vertex and fragment shaders. */
        VERTEX_FRAGMENT_VARYINGS: string;

        /** Common uniforms shared by fragment shaders. */
        FRAGMENT_UNIFORMS: string;

        /** Useful constant values computed at compile time */
        CONSTANTS: string;

        /**
         * Fast approximate perceived brightness computation
         * Using Digital ITU BT.709 : Exact luminance factors
         */
        PERCEIVED_BRIGHTNESS: string;

        /**
         * Fractional Brownian Motion for a given number of octaves
         * @param [octaves=4]
         * @param [amp=1.0]
         */
        FBM(octaves?: number, amp?: number): string;

        /**
         * High Quality Fractional Brownian Motion
         * @param [octaves=3]
         */
        FBMHQ(octaves?: number): string;

        /** A conventional pseudo-random number generator with the "golden" numbers, based on uv position */
        PRNG: string;

        /** A Vec3 pseudo-random generator, based on uv position */
        PRNG3D: string;

        /** A conventional noise generator */
        NOISE: string;

        /** Convert a Hue-Saturation-Brightness color to RGB - useful to convert polar coordinates to RGB */
        HSB2RGB: string;

        /**
         * Declare a wave function in a shader -> wcos (default), wsin or wtan.
         * Wave on the [v1,v2] range with amplitude -> a and speed -> speed.
         * @param [func="cos"] the math function to use
         */
        WAVE(func?: string): string;
    }

    /**
     * This class defines an interface which all shaders utilize
     * @property uniforms The current uniforms of the Shader
     */
    abstract class AbstractBaseShader extends BaseShaderMix {
        protected _defaults: object;

        constructor(program: string, uniforms: object);

        /**
         * The raw vertex shader used by this class.
         * A subclass of AbstractBaseShader must implement the vertexShader static field.
         */
        static vertexShader: string;

        /**
         * The raw fragment shader used by this class.
         * A subclass of AbstractBaseShader must implement the fragmentShader static field.
         */
        static fragmentShader: string;

        /**
         * The default uniform values for the shader.
         * A subclass of AbstractBaseShader must implement the defaultUniforms static field.
         */
        static defaultUniforms: object;

        /** A factory method for creating the shader using its defined default values */
        static create<T extends AbstractBaseShader>(this: ConstructorOf<T>, defaultUniforms: object): T;

        /**
         * Reset the shader uniforms back to their provided default values
         */
        reset(): void;
    }

    /**
     * An abstract filter which provides a framework for reusable definition
     */
    class AbstractBaseFilter extends BaseFilterMix {
        /** The default uniforms used by the filter */
        static defaultUniforms: Record<string, unknown>;

        /** The fragment shader which renders this filter. */
        static fragmentShader: string;

        /** The vertex shader which renders this filter. */
        static vertexShader: string;

        /**
         * A factory method for creating the filter using its defined default values.
         * @param [uniforms] Initial uniform values which override filter defaults
         * @returns The constructed AbstractFilter instance.
         */
        static create<T extends AbstractBaseFilter>(this: ConstructorOf<T>, uniforms?: object): T;

        /** Always target the resolution of the render texture or renderer */
        get resolution(): number;

        set resolution(value: number);

        /** Always target the MSAA level of the render texture or renderer */
        multisample: number;
    }
}

type BaseShaderMix<TBase extends PIXI.Shader> = BaseShaderMixin<TBase>;
declare const BaseShaderMix: BaseShaderMix<PIXI.Shader>;

type BaseFilterMix<TBase extends PIXI.Filter> = BaseShaderMixin<TBase>;
declare const BaseFilterMix: BaseFilterMix<PIXI.Filter>;
