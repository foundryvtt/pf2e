import type * as fields from "@common/data/fields.mjs";
import { RegionBehaviorType } from "./base.mjs";

/** The data model for a behavior that teleports Token that enter the Region to a preset destination Region. */
export class TeleportTokenRegionBehaviorType extends RegionBehaviorType<TeleportTokenRegionBehaviorTypeSchema> {
    static override defineSchema(): TeleportTokenRegionBehaviorTypeSchema;
}

export interface TeleportTokenRegionBehaviorType
    extends RegionBehaviorType<TeleportTokenRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<TeleportTokenRegionBehaviorTypeSchema> {}

export type TeleportTokenRegionBehaviorTypeSchema = {
    /** The destination Region the Token is teleported to. */
    destination: fields.DocumentUUIDField;
};
