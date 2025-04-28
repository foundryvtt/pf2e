import BaseShaderMixin from "../mixins/base-shader-mixin.mjs";

/**
 * An abstract filter which provides a framework for reusable definition
 */
export default abstract class AbstractBaseFilter extends BaseShaderMixin(PIXI.Filter) {
    /**
     * The default uniforms used by the filter
     */
    static defaultUniforms: object;

    /**
     * The fragment shader which renders this filter.
     */
    static fragmentShader: string | (() => string);

    /**
     * The vertex shader which renders this filter.
     */
    static vertexShader: string;

    /**
     * A factory method for creating the filter using its defined default values.
     * @param initialUniforms Initial uniform values which override filter defaults
     * @returns The constructed AbstractFilter instance.
     */
    static create(initialUniforms?: object | undefined): AbstractBaseFilter;
}
