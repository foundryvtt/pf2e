import type * as fields from "@common/data/fields.mjs";
import RegionBehaviorType, { EventsField } from "./base.mjs";

/** The data model for a behavior that toggles Region Behaviors when one of the subscribed events occurs. */
export default class ToggleBehaviorRegionBehaviorType extends RegionBehaviorType<ToggleBehaviorRegionBehaviorTypeSchema> {
    static override defineSchema(): ToggleBehaviorRegionBehaviorTypeSchema;
}

export default interface ToggleBehaviorRegionBehaviorType
    extends RegionBehaviorType<ToggleBehaviorRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<ToggleBehaviorRegionBehaviorTypeSchema> {}

export type ToggleBehaviorRegionBehaviorTypeSchema = {
    /** The events that are handled by the behavior. */
    events: EventsField;
    /** The Region Behavior UUIDs that are enabled. */
    enable: fields.SetField<fields.DocumentUUIDField>;
    /** The Region Behavior UUIDs that are disabled. */
    disable: fields.SetField<fields.DocumentUUIDField>;
};
