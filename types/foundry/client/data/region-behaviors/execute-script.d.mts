import * as fields from "@common/data/fields.mjs";
import RegionBehaviorType, { EventsField } from "./base.mjs";

/** The data model for a behavior that executes a script. */
export default class ExecuteScriptRegionBehaviorType extends RegionBehaviorType<ExecuteScriptRegionBehaviorTypeSchema> {}

export default interface ExecuteScriptRegionBehaviorType
    extends RegionBehaviorType<ExecuteScriptRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<ExecuteScriptRegionBehaviorTypeSchema> {}

export type ExecuteScriptRegionBehaviorTypeSchema = {
    /** The events that are handled by the behavior. */
    events: EventsField;
    /** The source code of the script. */
    source: fields.JavaScriptField;
};
