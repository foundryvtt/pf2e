import { TokenMovementWaypoint } from "@client/documents/_types.mjs";
import RegionBehavior from "@client/documents/region-behavior.mjs";
import { RegionEvent } from "@client/documents/region.mjs";
import TokenDocument from "@client/documents/token.mjs";
import { DataSchema } from "@common/abstract/_types.mjs";
import TypeDataModel from "@common/abstract/type-data.mjs";
import { REGION_EVENTS } from "@common/constants.mjs";
import * as fields from "@common/data/fields.mjs";

/**
 * The data model for a behavior that receives Region events. *
 */
export default abstract class RegionBehaviorType<
    TSchema extends DataSchema = DataSchema,
    TParent extends RegionBehavior | null = RegionBehavior | null,
> extends TypeDataModel<TParent, TSchema> {
    /**
     * Create the events field.
     * @param options Options which configure how the events field is declared
     * @param options.events The event names to restrict to.
     * @param options.initial The initial set of events that should be default for the field
     */
    protected static _createEventsField({ events, initial }?: { events: string[]; initial: string[] }): EventsField;

    /**
     * A RegionBehaviorType may register to always receive certain events by providing a record of handler functions.
     * These handlers are called with the behavior instance as its bound scope.
     */
    static events: Record<string, EventBehaviorStaticHandler>;

    /** The events that are handled by the behavior. */
    events: fields.ModelPropFromDataField<EventsField>;

    /** A convenience reference to the RegionBehavior which contains this behavior sub-type. */
    get behavior(): RegionBehavior | null;

    /** A convenience reference to the RegionDocument which contains this behavior sub-type. */
    get region(): RegionBehavior["region"];

    /** A convenience reference to the Scene which contains this behavior sub-type. */
    get scene(): RegionBehavior["scene"];

    /**
     * Handle the Region event.
     * @param {RegionEvent} event    The Region event
     * @internal
     */
    protected _handleRegionEvent(event: RegionEvent): Promise<void>;

    /**
     * Get the terrain effects of this behavior for the movement of the given token.
     * This function is called only for behaviors that are not disabled.
     * The terrain data is created from the terrain effects
     * ({@link CONFIG.Token.movement.TerrainData.resolveTerrainEffects}).
     * Returns an empty array by default.
     * @param token The token being or about to be moved within the region of this behavior
     * @param segment The segment data of the token's movement
     * @returns The terrain effects that apply to this token's movement
     */
    protected _getTerrainEffects(
        token: TokenDocument,
        segment: Pick<TokenMovementWaypoint, "width" | "height" | "shape" | "action"> & { preview: boolean },
    ): object[];
}

/** Run in the context of a {@link RegionBehaviorType} */
type EventBehaviorStaticHandler = <TBehaviorType extends RegionBehaviorType>(
    this: TBehaviorType,
    event: RegionEvent,
) => Promise<void>;

type RegionEventType = (typeof REGION_EVENTS)[keyof typeof REGION_EVENTS];

export type EventsField = fields.SetField<fields.StringField<RegionEventType, RegionEventType, true, false, false>>;
