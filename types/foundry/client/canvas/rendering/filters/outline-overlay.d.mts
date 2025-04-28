import AbstractBaseFilter from "./base-filter.mjs";

/**
 * A filter which implements an outline.
 * Inspired from https://github.com/pixijs/filters/tree/main/filters/outline
 * @license MIT
 */
export default class OutlineOverlayFilter extends AbstractBaseFilter {
    static override defaultUniforms: {
        outlineColor: number[];
        thickness: number[];
        alphaThreshold: number;
        knockout: boolean;
        wave: boolean;
    };

    /**
     * Dynamically create the fragment shader used for filters of this type.
     */
    static createFragmentShader(): string;

    static override create(initialUniforms?: object): OutlineOverlayFilter;

    /**
     * If the filter is animated or not.
     */
    animated: boolean;

    /**
     * The thickness of the outline.
     */
    get thickness(): number;

    set thickness(value);

    apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        _currentState?: PIXI.FilterState,
    ): void;
}
