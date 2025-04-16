/**
 * A filter which implements an outline.
 * Inspired from https://github.com/pixijs/filters/tree/main/filters/outline
 * @license MIT
 */
export default class OutlineOverlayFilter extends AbstractBaseFilter {
    /** @inheritdoc */
    static defaultUniforms: {
        outlineColor: number[];
        thickness: number[];
        alphaThreshold: number;
        knockout: boolean;
        wave: boolean;
    };
    /**
     * Dynamically create the fragment shader used for filters of this type.
     * @returns {string}
     */
    static createFragmentShader(): string;
    /**
     * Quality of the outline according to performance mode.
     * @returns {number}
     */
    static get "__#313@#quality"(): number;
    /** @inheritdoc */
    static create(initialUniforms?: {}): OutlineOverlayFilter;
    /**
     * If the filter is animated or not.
     * @type {boolean}
     */
    animated: boolean;
    set thickness(value: number);
    /**
     * The thickness of the outline.
     * @type {number}
     */
    get thickness(): number;
    /** @override */
    override apply(filterManager: any, input: any, output: any, clear: any): void;
    /**
     * @deprecated since v12
     * @ignore
     */
    set animate(v: boolean);
    /**
     * @deprecated since v12
     * @ignore
     */
    get animate(): boolean;
    #private;
}
import AbstractBaseFilter from "./base-filter.mjs";
