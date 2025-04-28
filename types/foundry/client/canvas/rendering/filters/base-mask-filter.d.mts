import AbstractBaseFilter from "./base-filter.mjs";

/**
 * This class defines an interface for masked custom filters
 */
export default class AbstractBaseMaskFilter extends AbstractBaseFilter {
    apply(
        filterManager: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clearMode?: PIXI.CLEAR_MODES,
        _currentState?: PIXI.FilterState,
    ): void;
}
