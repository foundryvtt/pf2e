import type * as fields from "../../../common/data/fields.d.ts";
import type { EventsField, RegionBehaviorType } from "./base.d.ts";

/** The data model a behavior that executes a Macro. */
export class ExecuteMacroRegionBehaviorType extends RegionBehaviorType<ExecuteMacroRegionBehaviorTypeSchema> {
    static override defineSchema(): ExecuteMacroRegionBehaviorTypeSchema;
}

export interface ExecuteMacroRegionBehaviorType
    extends RegionBehaviorType<ExecuteMacroRegionBehaviorTypeSchema>,
        ModelPropsFromSchema<ExecuteMacroRegionBehaviorTypeSchema> {}

export type ExecuteMacroRegionBehaviorTypeSchema = {
    /** The events that are handled by the behavior. */
    events: EventsField;
    /** The Macro UUID. */
    uuid: fields.DocumentUUIDField;
};
