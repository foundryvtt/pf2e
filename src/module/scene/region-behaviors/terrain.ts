import { resetActors } from "@actor/helpers.ts";
import type { TokenDocumentPF2e } from "@scene";
import type { RegionEventType } from "types/foundry/client-esm/data/region-behaviors/base.d.ts";
import type { SetField, StringField } from "types/foundry/common/data/fields.d.ts";

class TerrainBehaviorTypePF2e extends foundry.data.regionBehaviors.RegionBehaviorType<TerrainTypeSchema> {
    override events = new Set<RegionEventType>(["tokenEnter", "tokenExit"]);

    static override defineSchema(): TerrainTypeSchema {
        const fields = foundry.data.fields;
        return {
            terrainTypes: new fields.SetField(
                new fields.StringField({
                    blank: true,
                    choices: () => CONFIG.PF2E.terrainTypes,
                }),
                { label: "PF2E.Regions.Terrain.Type.Label", hint: "PF2E.Regions.Terrain.Type.Hint" },
            ),
            mode: new fields.StringField({
                blank: false,
                choices: () => ({
                    add: "PF2E.Regions.Terrain.Modes.Add.Label",
                    override: "PF2E.Regions.Terrain.Modes.Override.Label",
                    remove: "PF2E.Regions.Terrain.Modes.Remove.Label",
                }),
                initial: "add",
                label: "PF2E.Regions.Terrain.Modes.Label",
                hint: "PF2E.Regions.Terrain.Modes.Hint",
            }),
        };
    }

    protected override async _handleRegionEvent(event: RegionEvent<TokenDocumentPF2e>): Promise<void> {
        if (event.name === "tokenEnter" || event.name === "tokenExit") {
            if (event.data.token.actor) resetActors([event.data.token.actor], { tokens: true });
        }
    }
}

interface TerrainBehaviorTypePF2e
    extends foundry.data.regionBehaviors.RegionBehaviorType<TerrainTypeSchema>,
        ModelPropsFromSchema<TerrainTypeSchema> {}

type TerrainTypeSchema = {
    terrainTypes: SetField<StringField>;
    mode: StringField<"add" | "remove" | "override">;
};

type TerrainTypeData = ModelPropsFromSchema<TerrainTypeSchema>;

export { TerrainBehaviorTypePF2e };
export type { TerrainTypeData };
