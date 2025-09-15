import type { ActorPF2e } from "@actor";
import type { TokenMeasureMovementPathOptions } from "@client/_types.d.mts";
import type { TokenMovementCostFunction } from "@client/documents/_types.d.mts";
import type { OneToThree } from "@module/data.ts";
import type { TokenDocumentPF2e } from "@scene";

export class TerrainDataPF2e extends foundry.data.TerrainData {
    /** Make terrain difficulty additive instead of multiplicative. */
    static override getMovementCostFunction(
        token: TokenDocumentPF2e,
        options?: TokenMeasureMovementPathOptions,
    ): TokenMovementCostFunction {
        if (!canvas.grid.isSquare) return super.getMovementCostFunction(token, options);
        return (_from, _to, distance, segment) => {
            if (segment.teleport) return 0;
            const difficulty = Math.clamp(Math.trunc(segment.terrain?.difficulty ?? 1), 1, 3) as OneToThree;
            if (difficulty === 1) return distance;
            const addend = (difficulty - 1) * canvas.grid.distance;
            const multiplier = this.#getMitigationMultiplier(token.actor, difficulty);
            return distance + addend * multiplier;
        };
    }

    static #getMitigationMultiplier(actor: ActorPF2e | null, difficulty: 2 | 3): number {
        const mitigationFeatures = actor?.isOfType("creature") ? actor.system.movement.terrain : null;
        if (!mitigationFeatures) return 1;
        const ignoreAllDifficult = mitigationFeatures.difficult.ignored.some(
            (i) => i.environment === "all" && i.feature === "all",
        );
        switch (difficulty) {
            case 3: {
                const ignoreAllGreater = mitigationFeatures.greater.ignored.some(
                    (i) => i.environment === "all" && i.feature === "all",
                );
                return ignoreAllGreater ? 0 : ignoreAllDifficult ? 0.5 : 1;
            }
            default:
                return ignoreAllDifficult ? 0 : 1;
        }
    }
}
