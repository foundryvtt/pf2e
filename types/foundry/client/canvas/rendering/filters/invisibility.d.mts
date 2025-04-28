import AbstractBaseFilter from "./base-filter.mjs";

/**
 * Invisibility effect filter for placeables.
 */
export default class InvisibilityFilter extends AbstractBaseFilter {
    static override defaultUniforms: {
        uSampler: null;
        color: number[];
    };
}
