/**
 * A mixin wich decorates a shader or filter and construct a fragment shader according to a choosen channel.
 * @category Mixins
 * @param {typeof PIXI.Shader|PIXI.Filter} ShaderClass The parent ShaderClass class being mixed.
 */
export default function AdaptiveFragmentChannelMixin(ShaderClass: typeof PIXI.Shader | PIXI.Filter): {
    new (): {};
    /**
     * The fragment shader which renders this filter.
     * A subclass of AdaptiveFragmentChannelMixin must implement the fragmentShader static field.
     * @type {Function}
     */
    adaptiveFragmentShader: Function;
    /**
     * A factory method for creating the filter using its defined default values
     * @param {object} [options]                Options which affect filter construction
     * @param {object} [options.uniforms]       Initial uniforms provided to the filter/shader
     * @param {string} [options.channel="r"]    The color channel to target for masking
     * @returns {PIXI.Shader|PIXI.Filter}
     */
    create({
        channel,
        ...uniforms
    }?:
        | {
              uniforms?: object | undefined;
              channel?: string | undefined;
          }
        | undefined): PIXI.Shader | PIXI.Filter;
    fragmentShader: any;
};
