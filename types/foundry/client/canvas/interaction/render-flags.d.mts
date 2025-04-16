import PlaceableObject from "../placeables/placeable-object.mjs";
import { RenderFlag } from "./_types.mjs";

/**
 * A data structure for tracking a set of boolean status flags.
 * This is a restricted set which can only accept flag values which are pre-defined.
 */
export default class RenderFlags extends Set<string> {
    /**
     * @param flags An object which defines the flags which are supported for tracking
     * @param config Optional configuration
     * @param config.object  The object which owns this RenderFlags instance
     * @param config.priority The ticker priority at which these render flags are handled
     */
    constructor(flags?: Record<string, RenderFlag>, config?: { object?: PlaceableObject; priority?: number });

    /**
     * @returns The flags which were previously set that have been cleared.
     */
    override clear(): Record<string, boolean>;

    /**
     * Allow for handling one single flag at a time.
     * This function returns whether the flag needs to be handled and removes it from the pending set.
     */
    handle(flag: string): boolean;

    /**
     * Activate certain flags, also toggling propagation and reset behaviors
     * @param {Object<boolean>} changes
     */
    set(changes: Record<string, boolean>): void;
}
