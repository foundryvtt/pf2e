/**
 * Invisibility effect filter for placeables.
 */
export default class InvisibilityFilter extends AbstractBaseFilter {
    /** @override */
    static override defaultUniforms: {
        uSampler: null;
        color: number[];
    };
}
import AbstractBaseFilter from "./base-filter.mjs";
