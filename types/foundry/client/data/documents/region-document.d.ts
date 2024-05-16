import type { RegionBehaviorSource } from "../../../common/documents/region-behavior.d.ts";
import type { CanvasBaseRegion } from "./client-base-mixes.d.ts";

declare global {
    class RegionDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseRegion<TParent> {
        /**
         * Activate the Socket event listeners.
         * @param    socket    The active game socket
         * @internal
         */
        static _activateSocketListeners(socket: unknown): void;

        /** The tokens inside this region. */
        tokens: Set<TokenDocument<TParent>>;

        /**
         * Trigger the Region event.
         * @param    eventName        The event name
         * @param    eventData        The event data
         * @internal
         */
        _triggerEvent(eventName: string, eventData: object): Promise<void>;

        /**
         * Handle the Region event.
         * @param {RegionEvent} event    The Region event
         * @internal
         */
        _handleEvent(event: unknown): Promise<void>;

        /**
         * Update the tokens of this region.
         * @param    [options={}]               Additional options
         * @param    [options.deleted=false]    Was the Region deleted?
         * @returns                             True if the regions could be updated. False otherwise.
         * @internal
         */
        _updateTokens(options?: { deleted?: boolean }): Promise<boolean>;

        override createEmbeddedDocuments(
            embeddedName: "RegionBehavior",
            data: PreCreate<RegionBehaviorSource>[],
            context?: DocumentModificationContext<this>,
        ): Promise<foundry.documents.BaseRegionBehavior[]>;
    }
}
