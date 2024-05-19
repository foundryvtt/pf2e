import type * as fields from "../../../common/data/fields.d.ts";
import type { RegionBehaviorType } from "./base.d.ts";

/**
 * The data model for a behavior that allows to suppress weather effects within the Region
 */
export class AdjustDarknessLevelRegionBehaviorType extends RegionBehaviorType<AdjustDarknessLevelRegionBehaviorSchema> {
    static override defineSchema(): AdjustDarknessLevelRegionBehaviorSchema;

    /** Darkness level behavior modes. */
    static get MODES(): {
        /** Override the darkness level with the modifier. */
        OVERRIDE: 0;
        /** Brighten the darkness level: `darknessLevel * (1 - modifier)` */
        BRIGHTEN: 1;
        /** Darken the darkness level: `1 - (1 - darknessLevel) * (1 - modifier)`. */
        DARKEN: 2;
    };
}

export interface AdjustDarknessLevelRegionBehaviorType
    extends RegionBehaviorType<AdjustDarknessLevelRegionBehaviorSchema>,
        ModelPropsFromSchema<AdjustDarknessLevelRegionBehaviorSchema> {}

export type AdjustDarknessLevelRegionBehaviorSchema = {
    mode: fields.NumberField<AdjustDarknessLevelRegionBehaviorModes, AdjustDarknessLevelRegionBehaviorModes, true>;
    modifier: fields.AlphaField;
};

type AdjustDarknessLevelRegionBehaviorModes =
    (typeof AdjustDarknessLevelRegionBehaviorType.MODES)[keyof typeof AdjustDarknessLevelRegionBehaviorType.MODES];
