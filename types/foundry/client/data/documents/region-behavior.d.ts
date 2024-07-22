import type { RegionBehaviorSource } from "../../../common/documents/region-behavior.d.ts";
import type { ClientBaseRegionBehavior } from "./client-base-mixes.d.ts";

declare global {
    /** The client-side RegionBehavior document which extends the common BaseRegionBehavior model. */
    class RegionBehavior<
        TParent extends RegionDocument | null = RegionDocument | null,
    > extends ClientBaseRegionBehavior<TParent> {
        /**
         * Construct a RegionBehavior document using provided data and context.
         * @param data    Initial data from which to construct the RegionBehavior
         * @param context      Construction context options
         */
        constructor(data: DeepPartial<RegionBehaviorSource>, context: DocumentConstructionContext<TParent>);

        /** A convenience reference to the RegionDocument which contains this RegionBehavior. */
        get region(): TParent;

        /** A convenience reference to the Scene which contains this RegionBehavior. */
        get scene(): NonNullable<TParent>["parent"];

        /** A RegionBehavior is active if and only if it was created, hasn't been deleted yet, and isn't disabled. */
        get active(): boolean;

        /** A RegionBehavior is viewed if and only if it is active and the Scene of its Region is viewed. */
        get viewed(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Does this RegionBehavior handle the Region events with the given name?
         * @param eventName    The Region event name
         */
        hasEvent(eventName: string): boolean;

        /**
         * Handle the Region event.
         * @param  event    The Region event
         * @internal
         */
        _handleRegionEvent(event: RegionEvent): Promise<void>;
    }
}
