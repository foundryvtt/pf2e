import type { DataSchema } from "../../../common/data/fields.d.ts";
import type { RegionBehaviorType } from "./base.d.ts";

/** The data model for a behavior that allows to suppress weather effects within the Region */
export class SuppressWeatherRegionBehaviorType extends RegionBehaviorType<SuppressWeatherRegionBehaviorTypeSchema> {
    static override defineSchema(): SuppressWeatherRegionBehaviorTypeSchema;
}

export interface SuppressWeatherRegionBehaviorType
    extends RegionBehaviorType<SuppressWeatherRegionBehaviorTypeSchema>,
        ModelPropsFromSchema<SuppressWeatherRegionBehaviorTypeSchema> {}

export type SuppressWeatherRegionBehaviorTypeSchema = DataSchema;
