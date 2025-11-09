import * as fields from "@common/data/fields.mjs";
import { TokenDocumentUUID } from "@common/documents/_module.mjs";
import RegionBehaviorType, { EventBehaviorStaticHandler } from "./base.mjs";

/** The data model for a behavior that teleports Token that enter the Region to a preset destination Region. */
export default class TeleportTokenRegionBehaviorType extends RegionBehaviorType<TeleportTokenRegionBehaviorTypeSchema> {
    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): TeleportTokenRegionBehaviorTypeSchema;

    static override events: Record<string, EventBehaviorStaticHandler>;

    /**
     * The query handler for teleporation confirmation.
     * @internal
     */
    static _confirmQuery: (queryData: { behaviorUuid: string; token: TokenDocumentUUID }) => Promise<void>;
}

export default interface TeleportTokenRegionBehaviorType
    extends RegionBehaviorType<TeleportTokenRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<TeleportTokenRegionBehaviorTypeSchema> {}

export type TeleportTokenRegionBehaviorTypeSchema = {
    /** The destination Region the Token is teleported to. */
    destination: fields.DocumentUUIDField;
    choice: fields.BooleanField;
};
