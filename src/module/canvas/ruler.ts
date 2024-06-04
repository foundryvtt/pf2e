import type { ActorPF2e } from "@actor";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import type { UserPF2e } from "@module/user/document.ts";
import type { ScenePF2e } from "@scene";
import type { EnvironmentRegionBehaviorPF2e } from "@scene/region-behavior/types.ts";
import type { TokenPF2e } from "./token/object.ts";

class RulerPF2e<TToken extends TokenPF2e = TokenPF2e, TUser extends UserPF2e = UserPF2e> extends Ruler<TToken, TUser> {
    /** A filtered list of scene region behaviors */
    #behaviors: EnvironmentRegionBehaviorPF2e[] = [];
    /** A cache for cost by behavior id */
    #behaviorCosts = new Map<string, number>();
    /** A cache for cost and difficulty label by grid coordinates */
    #coordinatesCache = new Map<string, { cost: number; label: string | null }>();
    /** The difficulty label for the current segment */
    #difficultyLabel: string | null = null;
    /** Difficult terrain labels */
    #difficultTerrainLabels: { standard: string; greater: string };

    constructor() {
        super();

        this.#difficultTerrainLabels = {
            standard: game.i18n.localize("PF2E.Region.Environment.DifficultTerrain.Standard"),
            greater: game.i18n.localize("PF2E.Region.Environment.DifficultTerrain.Greater"),
        };
    }

    protected override _startMeasurement(origin: Point, options?: { snap?: boolean; token?: TToken | null }): void {
        this.#behaviors =
            canvas.scene?.regions.contents.flatMap((r) =>
                r.behaviors.filter((b): b is EnvironmentRegionBehaviorPF2e<RegionDocument<ScenePF2e>> =>
                    b.isOfType("environment"),
                ),
            ) ?? [];
        super._startMeasurement(origin, options);
    }

    protected override _endMeasurement(): void {
        this.#behaviors = [];
        this.#behaviorCosts.clear();
        this.#coordinatesCache.clear();
        this.#difficultyLabel = null;

        super._endMeasurement();
    }

    protected override _getCostFunction(): GridMeasurePathCostFunction | void {
        // This function will be called for every ruler segment every time the length changes
        return (_from, to, distance) => {
            const point = canvas.grid.getCenterPoint(to);
            const coords = `${point.x}.${point.y}`;
            // Return cached cost and difficulty label for this grid coordinate to avoid testing all regions again
            if (this.#coordinatesCache.has(coords)) {
                const data = this.#coordinatesCache.get(coords);
                this.#difficultyLabel = data?.label ?? null;
                return data?.cost ?? distance;
            }
            const elevation = this.token?.document.elevation ?? 0;
            const behaviors = this.#behaviors.filter((b) => {
                const inside = b.region.object.testPoint(point, elevation);
                if (!inside) return false;
                return b.system.groundOnly ? elevation === 0 : true;
            });
            if (behaviors.length > 0) {
                const isGreater = behaviors.some((b) => b.system.difficultTerrain === "greater");
                this.#difficultyLabel = isGreater
                    ? this.#difficultTerrainLabels.greater
                    : this.#difficultTerrainLabels.standard;
                const cost = this.#calculateCost(behaviors, distance, isGreater);
                this.#coordinatesCache.set(coords, { cost, label: this.#difficultyLabel });
                return cost;
            }
            this.#difficultyLabel = null;
            this.#coordinatesCache.set(coords, { cost: distance, label: null });
            return distance;
        };
    }

    protected override _getSegmentLabel(segment: RulerMeasurementSegment): string {
        if (segment.teleport) return "";
        const isWaypoint = this.waypoints.some((p) => p.x === segment.ray.B.x && p.y === segment.ray.B.y);
        const units = canvas.grid.units;
        let label = `${Math.round(segment.cumulativeDistance * 100) / 100}${units ? ` ${units}` : ""}`;
        if (segment.last || isWaypoint) {
            const cumulativeCost = `${Math.round(segment.cumulativeCost * 100) / 100}${units ? ` ${units}` : ""}`;
            label += ` [${cumulativeCost}]`;
        }
        const lines = [label];
        if (this.#difficultyLabel && !isWaypoint) {
            lines.push(this.#difficultyLabel);
        }
        return lines.join("\n");
    }

    #calculateCost(behaviors: EnvironmentRegionBehaviorPF2e[], distance: number, isGreater: boolean): number {
        for (const behavior of behaviors) {
            // Return a cached value as it is very unlikely that the behavior changes while measuring
            if (this.#behaviorCosts.has(behavior.id)) {
                return this.#behaviorCosts.get(behavior.id) ?? distance;
            }
        }
        const actor = this.token?.actor;
        if (!actor) return distance;

        const difficulTerrainModifier = new ModifierPF2e({
            label: "",
            modifier: 1,
            adjustments: extractModifierAdjustments(
                actor.synthetics.modifierAdjustments,
                ["difficult-terrain-multiplier"],
                "difficult-terrain-multiplier",
            ),
        });
        const rollOptions = this.#getRollOptionsForBehaviors(actor, behaviors);
        const statistic = new StatisticModifier("difficult-terrain-multiplier", [difficulTerrainModifier], rollOptions);
        const multiplier = Math.clamp(isGreater ? statistic.totalModifier + 1 : statistic.totalModifier, 0, 2);
        const cost = distance + multiplier * 5;

        for (const behavior of behaviors) {
            this.#behaviorCosts.set(behavior.id, cost);
        }
        return cost;
    }

    /** Get roll options for regions the ruler passes through as if the actor was in those regions */
    #getRollOptionsForBehaviors(actor: ActorPF2e, behaviors: EnvironmentRegionBehaviorPF2e[]): string[] {
        const tokenDoc = this.token?.document;
        const tokenRegions = tokenDoc?.regions;
        if (!tokenDoc || !tokenRegions) return [];
        const regions = behaviors.map((b) => b.region);
        const newRegions = regions.filter((r) => !tokenRegions.has(r));
        for (const region of newRegions) {
            tokenRegions.add(region);
        }
        actor.reset();
        const options = actor.getRollOptions();
        for (const region of newRegions) {
            tokenRegions.delete(region);
        }
        actor.reset();
        return options;
    }
}

export { RulerPF2e };
