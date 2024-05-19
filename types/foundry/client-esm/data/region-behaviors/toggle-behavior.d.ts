import type * as fields from "../../../common/data/fields.d.ts";
import type { EventsField, RegionBehaviorType } from "./base.d.ts";

/** The data model for a behavior that toggles Region Behaviors when one of the subscribed events occurs. */
export class ToggleBehaviorRegionType extends RegionBehaviorType<ToggleBehaviorRegionTypeSchema> {
    static override defineSchema(): ToggleBehaviorRegionTypeSchema;
}

export interface ToggleBehaviorRegionType
    extends RegionBehaviorType<ToggleBehaviorRegionTypeSchema>,
        ModelPropsFromSchema<ToggleBehaviorRegionTypeSchema> {}

type ToggleBehaviorRegionTypeSchema = {
    /** The events that are handled by the behavior. */
    events: EventsField;
    /** The Region Behavior UUIDs that are enabled. */
    enable: fields.SetField<fields.DocumentUUIDField>;
    /** The Region Behavior UUIDs that are disabled. */
    disable: fields.SetField<fields.DocumentUUIDField>;
};
