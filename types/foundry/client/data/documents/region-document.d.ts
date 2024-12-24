import type { RegionSource } from "../../../common/documents/region.d.ts";
import type { CanvasBaseRegion } from "./client-base-mixes.d.ts";

declare global {
    class RegionDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseRegion<TParent> {
        /**
         * Construct a Region document using provided data and context.
         * @param data      Initial data from which to construct the Region
         * @param context   Construction context options
         */
        constructor(data: PreCreate<RegionSource>, context: DocumentConstructionContext<TParent>);

        /**
         * Activate the Socket event listeners.
         * @param    socket    The active game socket
         * @internal
         */
        static _activateSocketListeners(socket: unknown): void;

        /** The tokens inside this region. */
        tokens: Set<CollectionValue<NonNullable<TParent>["tokens"]>>;

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
    }

    interface RegionDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseRegion<TParent> {
        _object: Region<this>;

        readonly behaviors: foundry.abstract.EmbeddedCollection<RegionBehavior<this>>;
    }

    interface BaseRegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User> {
        /** The name of the event */
        name: string;
        /** The data of the event */
        data: object;
        /** The Region the event was triggered on */
        region: TDocument;
        /** The User that triggered the event */
        user: TUser;
    }

    interface BehaviorStatusRegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User>
        extends BaseRegionEvent<TDocument, TUser> {
        name: "behaviorStatus";
        data: {
            active: boolean;
            viewed: boolean;
        };
    }

    interface CombatRegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User>
        extends BaseRegionEvent<TDocument, TUser> {
        name: "tokenRoundStart" | "tokenRoundEnd" | "tokenTurnStart" | "tokenTurnEnd";
        data: {
            token: SetElement<TDocument["tokens"]>;
            combatant: SetElement<TDocument["tokens"]>["combatant"];
        };
    }

    interface TokenBasicMoveRegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User>
        extends BaseRegionEvent<TDocument, TUser> {
        name: "tokenEnter" | "tokenExit";
        data: {
            token: SetElement<TDocument["tokens"]>;
        };
    }

    interface TokenMoveRegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User>
        extends BaseRegionEvent<TDocument, TUser> {
        name: "tokenPreMove" | "tokenMove" | "tokenMoveIn" | "tokenMoveOut";
        data: {
            destination: RegionMovementWaypoint;
            forced: boolean;
            origin: RegionMovementWaypoint;
            segments: RegionMovementSegment[];
            teleport: boolean;
            token: SetElement<TDocument["tokens"]>;
        };
    }

    interface RegionBoundaryRegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User>
        extends BaseRegionEvent<TDocument, TUser> {
        name: "regionBoundary";
        data: object;
    }

    type RegionEvent<TDocument extends RegionDocument = RegionDocument, TUser extends User = User> =
        | BehaviorStatusRegionEvent<TDocument, TUser>
        | CombatRegionEvent<TDocument, TUser>
        | TokenMoveRegionEvent<TDocument, TUser>
        | TokenBasicMoveRegionEvent<TDocument, TUser>;

    interface SocketRegionEvent<TData extends object = object> {
        /** The UUID of the Region the event was triggered on */
        regionUuid: string;
        /** The ID of the User that triggered the event */
        userId: string;
        /** The name of the event */
        eventName: string;
        /** The data of the event */
        eventData: TData;
        /** The keys of the event data that are Documents */
        eventDataUuids: string[];
    }
}
