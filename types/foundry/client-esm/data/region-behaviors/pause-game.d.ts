import type * as fields from "../../../common/data/fields.d.ts";
import type { RegionBehaviorType } from "./base.d.ts";

/** The data model for a behavior that pauses the game when a player-controlled Token enters the Region. */
export class PauseGameRegionBehaviorType extends RegionBehaviorType<PauseGameRegionBehaviorTypeSchema> {
    static override defineSchema(): PauseGameRegionBehaviorTypeSchema;
}

export interface PauseGameRegionBehaviorType
    extends RegionBehaviorType<PauseGameRegionBehaviorTypeSchema>,
        ModelPropsFromSchema<PauseGameRegionBehaviorTypeSchema> {}

export type PauseGameRegionBehaviorTypeSchema = {
    /** Disable the behavior once a player-controlled Token enters the region? */
    once: fields.BooleanField;
};
