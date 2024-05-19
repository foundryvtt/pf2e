import type * as fields from "../../../common/data/fields.d.ts";
import type { RegionBehaviorType } from "./base.d.ts";

/** The data model for a behavior that pauses the game when a player-controlled Token enters the Region. */
export class PauseGameBehaviorType extends RegionBehaviorType<PauseGameBehaviorTypeSchema> {
    static override defineSchema(): PauseGameBehaviorTypeSchema;
}

export interface PauseGameBehaviorType
    extends RegionBehaviorType<PauseGameBehaviorTypeSchema>,
        ModelPropsFromSchema<PauseGameBehaviorTypeSchema> {}

type PauseGameBehaviorTypeSchema = {
    /** Disable the behavior once a player-controlled Token enters the region? */
    once: fields.BooleanField;
};
