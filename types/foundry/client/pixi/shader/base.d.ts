/** This class defines an interface which all shaders utilize */
declare class AbstractBaseShader extends PIXI.Shader {
    constructor(program: PIXI.Program, uniforms: PIXI.UniformGroup);

    /** The initial default values of shader uniforms */
    protected _defaults: DefaultShaderUniforms;

    /** The default vertex shader used by all instances of AbstractBaseShader */
    static vertexShader: string;

    /**
     * The fragment shader which renders this source.
     * A subclass of AbstractBaseShader must implement the fragmentShader static field.
     */
    static fragmentShader: string;

    /**
     * The default uniform values for the shader.
     * A subclass of AbstractBaseShader must implement the defaultUniforms static field.
     */
    static defaultUniforms: DefaultShaderUniforms;

    /** A factory method for creating the shader using its defined default values */
    static create<T extends AbstractBaseShader>(this: ConstructorOf<T>, defaultUniforms: DefaultShaderUniforms): T;

    /** Reset the shader uniforms back to their provided default values */
    reset(): void;

    /* -------------------------------------------- */
    /*  GLSL Helper Functions                       */
    /* -------------------------------------------- */

    /** A Vec3 pseudo-random generator, based on uv position */
    static PRNG3D: string;

    /** A conventional pseudo-random number generator with the "golden" numbers, based on uv position */
    static PRNG: string;

    /** A conventional noise generator */
    static NOISE: string;

    /** Fractional Brownian Motion for a given number of octaves */
    static FBM(octaves?: number, amp?: number): string;

    /** Fade easing to use with distance in interval [0,1] */
    static FADE(amp?: number, coef?: number): string;

    /** Convert a Hue-Saturation-Brightness color to RGB - useful to convert polar coordinates to RGB */
    static HSB2RGB: string;
}

declare interface DefaultShaderUniforms {
    alpha: number;
    ratio: number;
    colorDim: [number, number, number];
    colorBright: [number, number, number];
    time: number;
    intensity: number;
}
