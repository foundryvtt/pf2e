/** This class defines an interface for masked custom filters */
declare class AbstractBaseMaskFilter extends PIXI.Filter {
    /** The default vertex shader used by all instances of AbstractBaseMaskFilter */
    static vertexShader: string;

    /**
     * The fragment shader which renders this filter.
     * A subclass of AbstractBaseMaskFilter must implement the fragmentShader(channel) static field.
     */
    static fragmentShader: (channel: string) => number;

    /**
     * A factory method for creating the filter using its defined default values
     * @param [defaultUniforms] Initial uniforms provided to the filter
     * @param [channel=r] A color channel to target for masking.
     */
    static create<T extends AbstractBaseMaskFilter>(
        this: ConstructorOf<T>,
        defaultUniforms?: DefaultShaderUniforms,
        channel?: string,
    ): T;

    override apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        currentState?: PIXI.FilterState,
    ): void;
}
