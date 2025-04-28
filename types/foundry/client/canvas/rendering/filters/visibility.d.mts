import AbstractBaseMaskFilter from "./base-mask-filter.mjs";

/**
 * Apply visibility coloration according to the baseLine color.
 * Uses very lightweight gaussian vertical and horizontal blur filter passes.
 */
export default class VisibilityFilter extends AbstractBaseMaskFilter {
    constructor(...args: any[]);

    static override defaultUniforms: {
        exploredColor: number[];
        unexploredColor: number[];
        screenDimensions: number[];
        visionTexture: null;
        primaryTexture: null;
        overlayTexture: null;
        overlayMatrix: PIXI.Matrix;
        hasOverlayTexture: boolean;
    };

    static override create(initialUniforms?: {}, options?: {}): VisibilityFilter;

    static override fragmentShader(options?: object): string;

    get blur(): number;

    /**
     * Set the blur strength
     * @param value blur strength
     */
    set blur(value);

    apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        _currentState?: PIXI.FilterState,
    ): void;

    /**
     * Calculate the fog overlay sprite matrix.
     * @param filterManager
     */
    calculateMatrix(filterManager: PIXI.FilterSystem): void;
}
