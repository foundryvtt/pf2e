import * as fields from "@common/data/fields.mjs";
import { EventsField, RegionBehaviorType } from "./base.mjs";

/** The data model a behavior that executes a Macro. */
export class ExecuteMacroRegionBehaviorType extends RegionBehaviorType<ExecuteMacroRegionBehaviorTypeSchema> {
    static override defineSchema(): ExecuteMacroRegionBehaviorTypeSchema;
}

export interface ExecuteMacroRegionBehaviorType
    extends RegionBehaviorType<ExecuteMacroRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<ExecuteMacroRegionBehaviorTypeSchema> {}

export type ExecuteMacroRegionBehaviorTypeSchema = {
    /** The events that are handled by the behavior. */
    events: EventsField;
    /** The Macro UUID. */
    uuid: fields.DocumentUUIDField;
};
