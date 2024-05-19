import type * as fields from "../../../common/data/fields.d.ts";
import type { RegionBehaviorType } from "./base.d.ts";

/** The data model for a behavior that teleports Token that enter the Region to a preset destination Region. */
export class TeleportTokenBehaviorType extends RegionBehaviorType<TeleportTokenBehaviorTypeSchema> {
    static override defineSchema(): TeleportTokenBehaviorTypeSchema;
}

export interface TeleportTokenBehaviorType
    extends RegionBehaviorType<TeleportTokenBehaviorTypeSchema>,
        ModelPropsFromSchema<TeleportTokenBehaviorTypeSchema> {}

type TeleportTokenBehaviorTypeSchema = {
    /** The destination Region the Token is teleported to. */
    destination: fields.DocumentUUIDField;
};
