import { TokenMovementWaypoint } from "@client/documents/_types.mjs";
import TokenDocument from "@client/documents/token.mjs";
import * as fields from "@common/data/fields.mjs";
import RegionBehaviorType, { EventBehaviorStaticHandler } from "./base.mjs";

/**
 * @import {RegionBehaviorViewedEvent, RegionBehaviorUnviewedEvent,
 *   RegionRegionBoundaryEvent} from "@client/documents/_types.mjs";
 */

/**
 * The data model for a behavior that allows to modify the movement cost within the Region.
 *
 * @property {{[movementAction: string]: number}} difficulties    The difficulty of each movement action
 */
export default class ModifyMovementCostRegionBehaviorType extends RegionBehaviorType {
    /** @override */
    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): ModifyMovementCostBehaviorSchema;

    static override events: Record<string, EventBehaviorStaticHandler>;

    override prepareBaseData(): void;

    protected override _onUpdate(changed: Record<string, unknown>, options: object, userId: string): void;

    protected override _getTerrainEffects(
        token: TokenDocument,
        segment: Pick<TokenMovementWaypoint, "width" | "height" | "shape" | "action"> & { preview: boolean },
    ): { name: "difficulty"; difficulty: number }[];
}

export type ModifyMovementCostBehaviorSchema = {
    difficulties: fields.SchemaField<Record<string, fields.NumberField<number, number, true, true, true>>>;
};
