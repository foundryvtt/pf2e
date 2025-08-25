import type { TokenMeasureMovementPathOptions, TokenMovementCostFunction } from "@client/_types.d.mts";
import type { ZeroToTwo } from "@module/data.ts";
import type { DifficultTerrainEffectData } from "./region-behavior/environment-feature.ts";
import fields = foundry.data.fields;

class TerrainDataPF2e extends foundry.data.TerrainData {
    static override defineSchema(): TerrainDataSchemaPF2e {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            difficultTerrain: new fields.NumberField({
                required: true,
                nullable: false,
                choices: [0, 1, 2],
                initial: 0,
            }),
        };
    }

    static override getMovementCostFunction<T extends TokenMovementCostFunction<TerrainDataPF2e>>(
        token: TokenDocument,
        options?: TokenMeasureMovementPathOptions,
    ): T {
        const baseFunction = super.getMovementCostFunction(token, options);
        const systemFunction: TokenMovementCostFunction<TerrainDataPF2e> = (from, to, distance, segment) => {
            const difficulty = segment.terrain?.difficultTerrain;
            if (difficulty) {
                return difficulty === 1 ? distance + 5 : difficulty === 2 ? distance + 10 : distance;
            }
            return baseFunction(from, to, distance, segment);
        };
        return systemFunction as T;
    }

    static override resolveTerrainEffects(effects: TerrainEffect[]): TerrainDataPF2e | null {
        let difficulty = 1;
        let difficultTerrain = 0;
        for (const effect of effects) {
            if (effect.name === "difficulty") difficulty *= effect.difficulty;
            if (effect.name === "difficultTerrainPF2e") {
                // Only apply the highest version of difficult terrain
                if (effect.difficultTerrain > difficultTerrain) difficultTerrain = effect.difficultTerrain;
            }
        }
        if (difficulty === 1 && difficultTerrain === 0) return null;
        return new this({ difficulty, difficultTerrain });
    }

    override equals(other: TerrainDataPF2e): boolean {
        if (!(other instanceof TerrainDataPF2e)) return false;
        return this.difficulty === other.difficulty && this.difficultTerrain === other.difficultTerrain;
    }
}

interface CoreTerrainDifficultyEffect {
    name: "difficulty";
    difficulty: number;
}

type TerrainEffect = CoreTerrainDifficultyEffect | DifficultTerrainEffectData;

interface TerrainDataPF2e extends foundry.data.TerrainData, fields.ModelPropsFromSchema<TerrainDataSchemaPF2e> {}

type TerrainDataSchemaPF2e = foundry.data.TerrainDataSchema & {
    difficultTerrain: fields.NumberField<ZeroToTwo, ZeroToTwo, true, false, true>;
};

export { TerrainDataPF2e };
