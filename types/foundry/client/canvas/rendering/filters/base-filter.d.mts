import BaseShaderMixin from "../mixins/base-shader-mixin.mjs";

/**
 * An abstract filter which provides a framework for reusable definition
 */
export default abstract class AbstractBaseFilter extends BaseShaderMixin(PIXI.Filter) {
    /**
     * The default uniforms used by the filter
     * @type {object}
     */
    static defaultUniforms: object;
    /**
     * The fragment shader which renders this filter.
     * @type {string}
     */
    static fragmentShader: string;
    /**
     * The vertex shader which renders this filter.
     * @type {string}
     */
    static vertexShader: string;
    /**
     * A factory method for creating the filter using its defined default values.
     * @param {object} [initialUniforms]  Initial uniform values which override filter defaults
     * @returns {AbstractBaseFilter}      The constructed AbstractFilter instance.
     */
    static create(initialUniforms?: object | undefined): AbstractBaseFilter;
}
