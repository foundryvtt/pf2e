import AbstractBaseShader from "../base-shader.mjs";

/**
 * The base shader class for weather shaders.
 */
export default class AbstractWeatherShader extends AbstractBaseShader {
    /**
     * Compute the weather masking value.
     * @type {string}
     */
    static COMPUTE_MASK: string;
    /**
     * Compute the weather masking value.
     * @type {string}
     */
    static FRAGMENT_HEADER: string;
    /**
     * Common uniforms for all weather shaders.
     * @type {{
     *  useOcclusion: boolean,
     *  occlusionTexture: PIXI.Texture|null,
     *  reverseOcclusion: boolean,
     *  occlusionWeights: number[],
     *  useTerrain: boolean,
     *  terrainTexture: PIXI.Texture|null,
     *  reverseTerrain: boolean,
     *  terrainWeights: number[],
     *  alpha: number,
     *  tint: number[],
     *  screenDimensions: [number, number],
     *  effectDimensions: [number, number],
     *  depthElevation: number,
     *  time: number
     * }}
     */
    static commonUniforms: {
        useOcclusion: boolean;
        occlusionTexture: PIXI.Texture | null;
        reverseOcclusion: boolean;
        occlusionWeights: number[];
        useTerrain: boolean;
        terrainTexture: PIXI.Texture | null;
        reverseTerrain: boolean;
        terrainWeights: number[];
        alpha: number;
        tint: number[];
        screenDimensions: [number, number];
        effectDimensions: [number, number];
        depthElevation: number;
        time: number;
    };

    /**
     * Default uniforms for a specific class
     */
    static override defaultUniforms: object;

    static override create(initialUniforms: unknown): AbstractWeatherShader;

    /**
     * Create the shader program.
     * @returns {PIXI.Program}
     */
    static createProgram(): PIXI.Program;
    constructor(...args: any[]);
    /**
     * Update the scale of this effect with new values
     * @param {number|{x: number, y: number}} scale    The desired scale
     */
    set scale(
        scale:
            | number
            | {
                  x: number;
                  y: number;
              },
    );
    set scaleX(x: number);
    set scaleY(y: number);

    /**
     * The speed multiplier applied to animation.
     * 0 stops animation.
     * @type {number}
     */
    speed: number;

    protected override _preRender(mesh: PIXI.Container, renderer: PIXI.Renderer): void;
}
