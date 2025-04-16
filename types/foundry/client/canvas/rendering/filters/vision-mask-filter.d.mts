export default class VisionMaskFilter extends AbstractBaseMaskFilter {
    /** @override */
    static override defaultUniforms: {
        uMaskSampler: null;
    };
    /** @override */
    static override create(): foundry.canvas.rendering.filters.AbstractBaseFilter;
    override set enabled(value: any);
    /**
     * Overridden as an alias for canvas.visibility.visible.
     * This property cannot be set.
     * @override
     */
    override get enabled(): any;
}
import AbstractBaseMaskFilter from "./base-mask-filter.mjs";
