import RegionBehavior from "@client/documents/region-behavior.mjs";
import { RegionEvent } from "@client/documents/region.mjs";
import { DataSchema } from "@common/abstract/_types.mjs";
import TypeDataModel from "@common/abstract/type-data.mjs";
import { REGION_EVENTS } from "@common/constants.mjs";
import * as fields from "@common/data/fields.mjs";

/**
 * The data model for a behavior that receives Region events.
 * @extends TypeDataModel
 * @memberof data.behaviors
 *
 */
export abstract class RegionBehaviorType<
    TSchema extends DataSchema = DataSchema,
    TParent extends RegionBehavior | null = RegionBehavior | null,
> extends TypeDataModel<TParent, TSchema> {
    /**
     * Create the events field.
     * @param  options      Options which configure how the events field is declared
     * @param  [options.events]     The event names to restrict to.
     * @param  [options.initial]    The initial set of events that should be default for the field
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
}

/** Run in the context of a {@link RegionBehaviorType} */
type EventBehaviorStaticHandler = <TBehaviorType extends RegionBehaviorType>(
    this: TBehaviorType,
    event: RegionEvent,
) => Promise<void>;

type RegionEventType = (typeof REGION_EVENTS)[keyof typeof REGION_EVENTS];

export type EventsField = fields.SetField<fields.StringField<RegionEventType, RegionEventType, true, false, false>>;
