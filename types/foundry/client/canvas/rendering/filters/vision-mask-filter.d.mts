import AbstractBaseMaskFilter from "./base-mask-filter.mjs";

export default class VisionMaskFilter extends AbstractBaseMaskFilter {
    static override defaultUniforms: {
        uMaskSampler: null;
    };

    static override create(): foundry.canvas.rendering.filters.AbstractBaseFilter;

    /**
     * Overridden as an alias for canvas.visibility.visible.
     * This property cannot be set.
     */
    readonly enabled: boolean;
}
