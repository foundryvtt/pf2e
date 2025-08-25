import type { ZeroToTwo } from "@module/data.ts";
import type { TokenDocumentPF2e } from "@scene/token-document/document.ts";
import { RegionBehaviorPF2e } from "./document.ts";
import fields = foundry.data.fields;

class EnvironmentFeatureBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType<
    EnvironmentFeatureTypeSchema,
    RegionBehaviorPF2e | null
> {
    static override defineSchema(): EnvironmentFeatureTypeSchema {
        const fields = foundry.data.fields;
        const locPathPrefix = "PF2E.Region.EnvironmentFeature";
        return {
            terrain: new fields.SchemaField(
                {
                    difficult: new fields.NumberField({
                        required: true,
                        nullable: false,
                        choices: {
                            0: `${locPathPrefix}.Terrain.Difficult.None`,
                            1: `${locPathPrefix}.Terrain.Difficult.Difficult`,
                            2: `${locPathPrefix}.Terrain.Difficult.Greater`,
                        },
                        initial: 0,
                        label: `${locPathPrefix}.Terrain.Difficult.Label`,
                    }),
                },
                { label: `${locPathPrefix}.Terrain.Label` },
            ),
        };
    }

    protected override _getTerrainEffects(
        _token: TokenDocumentPF2e,
        segment: fd.TokenMovementSegmentData,
    ): DifficultTerrainEffectData[] {
        // Todo: Handle other actions
        if (segment.action !== "walk") return [];
        return [{ name: "difficultTerrainPF2e", difficultTerrain: this.terrain.difficult }];
    }
}

interface EnvironmentFeatureBehaviorType
    extends foundry.data.regionBehaviors.RegionBehaviorType<EnvironmentFeatureTypeSchema, RegionBehaviorPF2e | null>,
        fields.ModelPropsFromSchema<EnvironmentFeatureTypeSchema> {}

type EnvironmentFeatureTypeSchema = {
    terrain: fields.SchemaField<{
        difficult: fields.NumberField<ZeroToTwo, ZeroToTwo, true, false, true>;
    }>;
};

interface DifficultTerrainEffectData {
    name: "difficultTerrainPF2e";
    difficultTerrain: number;
}

export { EnvironmentFeatureBehaviorType };
export type { DifficultTerrainEffectData };
