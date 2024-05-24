import type { TerrainType } from "@scene/data.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";

class TerrainBehaviorTypePF2e extends foundry.data.regionBehaviors.RegionBehaviorType<TerrainTypeSchema> {
    static override defineSchema(): TerrainTypeSchema {
        const fields = foundry.data.fields;
        return {
            exclusive: new fields.BooleanField({
                initial: false,
                label: "PF2E.Regions.Terrain.Exclusive.Label",
                hint: "PF2E.Regions.Terrain.Exclusive.Hint",
            }),
            terrainType: new fields.StringField({
                blank: true,
                choices: () => CONFIG.PF2E.terrainTypes,
                label: "PF2E.Regions.Terrain.Type.Label",
                hint: "PF2E.Regions.Terrain.Type.Hint",
            }),
        };
    }
}

interface TerrainBehaviorTypePF2e
    extends foundry.data.regionBehaviors.RegionBehaviorType<TerrainTypeSchema>,
        ModelPropsFromSchema<TerrainTypeSchema> {}

type TerrainTypeSchema = {
    exclusive: BooleanField;
    terrainType: StringField<TerrainType>;
};

export { TerrainBehaviorTypePF2e };
