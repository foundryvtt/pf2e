export {};

declare global {
    /** This class defines an interface for masked custom filters */
    class AbstractBaseMaskFilter extends AbstractBaseFilter {
        /** The default vertex shader used by all instances of AbstractBaseMaskFilter */
        static vertexShader: string;

        override apply(
            filterManager: PIXI.FilterSystem,
            input: PIXI.RenderTexture,
            output: PIXI.RenderTexture,
            clearMode?: PIXI.CLEAR_MODES,
            _currentState?: PIXI.FilterState,
        ): void;
    }

    /**
     * A filter which implements an outline.
     * Inspired from https://github.com/pixijs/filters/tree/main/filters/outline
     * @license MIT
     */
    class OutlineOverlayFilter extends AbstractBaseFilter {
        override padding: number;

        override autoFit: boolean;

        /** If the filter is animated or not. */
        animate: boolean;

        static override defaultUniforms: Record<string, unknown>;

        static vertexShader: string;

        static createFragmentShader(): string;

        /** The thickness of the outline. */
        get thickness(): number;

        set thickness(value: number);

        static create<T extends AbstractBaseFilter>(this: ConstructorOf<T>, uniforms?: object): T;

        override apply(
            filterManager: PIXI.FilterSystem,
            input: PIXI.RenderTexture,
            output: PIXI.RenderTexture,
            clearMode?: PIXI.CLEAR_MODES,
            _currentState?: PIXI.FilterState,
        ): void;
    }
}
