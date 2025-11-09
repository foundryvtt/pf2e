import * as fields from "@common/data/fields.mjs";
import RegionBehaviorType from "./base.mjs";

/** The data model for a behavior that pauses the game when a player-controlled Token enters the Region. */
export default class PauseGameRegionBehaviorType extends RegionBehaviorType<PauseGameRegionBehaviorTypeSchema> {
    static override defineSchema(): PauseGameRegionBehaviorTypeSchema;
}

export default interface PauseGameRegionBehaviorType
    extends RegionBehaviorType<PauseGameRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<PauseGameRegionBehaviorTypeSchema> {}

export type PauseGameRegionBehaviorTypeSchema = {
    /** Disable the behavior once a player-controlled Token enters the region? */
    once: fields.BooleanField;
};
