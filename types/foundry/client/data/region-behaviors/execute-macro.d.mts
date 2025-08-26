import * as fields from "@common/data/fields.mjs";
import RegionBehaviorType, { EventsField } from "./base.mjs";

/** The data model a behavior that executes a Macro. */
export default class ExecuteMacroRegionBehaviorType extends RegionBehaviorType<ExecuteMacroRegionBehaviorTypeSchema> {
    static override defineSchema(): ExecuteMacroRegionBehaviorTypeSchema;
}

export default interface ExecuteMacroRegionBehaviorType
    extends RegionBehaviorType<ExecuteMacroRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<ExecuteMacroRegionBehaviorTypeSchema> {}

export type ExecuteMacroRegionBehaviorTypeSchema = {
    /** The events that are handled by the behavior. */
    events: EventsField;
    /** The Macro UUID. */
    uuid: fields.DocumentUUIDField;
};
