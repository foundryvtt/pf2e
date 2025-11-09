/**
 * A mixin wich decorates a shader or filter and construct a fragment shader according to a choosen channel.
 * @param ShaderClass The parent ShaderClass class being mixed.
 */
export default function AdaptiveFragmentChannelMixin(ShaderClass: typeof PIXI.Shader | typeof PIXI.Filter): {
    /**
     * The fragment shader which renders this filter.
     * A subclass of AdaptiveFragmentChannelMixin must implement the fragmentShader static field.
     */
    adaptiveFragmentShader: Function;

    /**
     * A factory method for creating the filter using its defined default values
     * @param options Options which affect filter construction
     * @param options.uniforms Initial uniforms provided to the filter/shader
     * @param options.channel The color channel to target for masking
     */
    create(options?: { uniforms?: object; channel?: "r" | "g" | "b" } | undefined): PIXI.Shader | PIXI.Filter;

    fragmentShader: string | (() => string);
};
