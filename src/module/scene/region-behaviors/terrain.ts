import type { RegionEventType } from "types/foundry/client-esm/data/region-behaviors/base.d.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";

class TerrainBehaviorTypePF2e extends foundry.data.regionBehaviors.RegionBehaviorType<TerrainTypeSchema> {
    override events = new Set<RegionEventType>(["tokenEnter", "tokenExit"]);

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

    protected override async _handleRegionEvent(event: RegionEvent): Promise<void> {
        if (event.name === "tokenEnter" || event.name === "tokenExit") {
            const actor = event.data.token.actor;
            actor?.reset();
            if (actor?.sheet.rendered) actor.sheet.render();
        }
    }
}

interface TerrainBehaviorTypePF2e
    extends foundry.data.regionBehaviors.RegionBehaviorType<TerrainTypeSchema>,
        ModelPropsFromSchema<TerrainTypeSchema> {}

type TerrainTypeSchema = {
    exclusive: BooleanField;
    terrainType: StringField<string>;
};

export { TerrainBehaviorTypePF2e };
