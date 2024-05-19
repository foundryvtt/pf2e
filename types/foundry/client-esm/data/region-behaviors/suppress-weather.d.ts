import type { RegionBehaviorType } from "./base.d.ts";

/** The data model for a behavior that allows to suppress weather effects within the Region */
export class SuppressWeatherBehaviorType extends RegionBehaviorType<SuppressWeatherBehaviorTypeSchema> {
    static override defineSchema(): SuppressWeatherBehaviorTypeSchema;
}

export interface SuppressWeatherBehaviorType
    extends RegionBehaviorType<SuppressWeatherBehaviorTypeSchema>,
        ModelPropsFromSchema<SuppressWeatherBehaviorTypeSchema> {}

type SuppressWeatherBehaviorTypeSchema = {};
