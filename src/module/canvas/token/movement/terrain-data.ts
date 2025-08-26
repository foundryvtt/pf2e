import type { TokenMeasureMovementPathOptions } from "@client/_types.d.mts";
import type { TokenMovementCostFunction } from "@client/documents/_types.d.mts";

export class TerrainDataPF2e extends foundry.data.TerrainData {
    /** Make terrain difficulty additive instead of multiplicative. */
    static override getMovementCostFunction(
        token: TokenDocument,
        options?: TokenMeasureMovementPathOptions,
    ): TokenMovementCostFunction {
        if (!canvas.grid.isSquare) return super.getMovementCostFunction(token, options);
        return (_from, _to, distance, segment) => {
            if (segment.teleport) return 0;
            const difficulty = (segment.terrain?.difficulty ?? 1) - 1;
            const additional = difficulty * canvas.grid.distance;
            return distance + additional;
        };
    }
}
