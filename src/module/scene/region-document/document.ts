import type { Level } from "@client/documents/_module.d.mts";
import type { DocumentConstructionContext } from "@common/_types.mjs";
import type { DatabaseCreateCallbackOptions, DatabaseDeleteCallbackOptions } from "@common/abstract/_module.d.mts";
import type EmbeddedCollection from "@common/abstract/embedded-collection.d.mts";
import type { DocumentFlags } from "@common/data/_types.d.mts";
import type { EffectAreaShape } from "@item/types.ts";
import type { RegionPF2e } from "@module/canvas/region.ts";
import type { ItemOriginFlag } from "@module/chat-message/data.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { toggleClearEffectAreaButton } from "@module/chat-message/helpers.ts";
import type { ScenePF2e } from "@scene";
import type { SpecificRegionBehavior } from "@scene/region-behavior/types.ts";
import type { GridOffset2D } from "@common/grid/_types.d.mts";
import { areaCoverage } from "./coverage.ts";

/** The grid spaces an effect area reaches, along with those in range but walled off from its origin */
interface EffectAreaOffsets {
    covered: GridOffset2D[];
    blocked: GridOffset2D[];
    /** Is the grid space at this offset covered? */
    covers: (offset: GridOffset2D) => boolean;
}

class RegionDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends RegionDocument<TParent> {
    /** Memoized grid coverage, keyed by level, since walls are per-level */
    declare private coverageByLevel: Map<string, EffectAreaOffsets>;

    /** The chat message from which this effect area was spawned */
    get message(): ChatMessagePF2e | null {
        return game.messages.get(this.flags[SYSTEM_ID]?.messageId ?? "") ?? null;
    }

    /** The region's game-mechanical shape if it is an effect area */
    get areaShape(): EffectAreaShape | null {
        return this.flags[SYSTEM_ID].areaShape;
    }

    /** Whether this region is a Pathfinder 2e effect area */
    get isEffectArea(): boolean {
        return this.shapes.length === 1 && !!this.areaShape;
    }

    /** Whether PF2e counts this region's grid spaces itself rather than leaving containment to its polygon */
    get isMeasuredArea(): boolean {
        if (!canvas.ready || !canvas.grid.isSquare || this.parent !== canvas.scene) return false;
        const shape = this.shapes.at(0);
        // Bursts and cylinders are circles; only circles, cones, and lines are template shapes we count ourselves
        return this.shapes.length === 1 && !!shape && ["circle", "cone", "line"].includes(shape.type);
    }

    /**
     * The grid spaces this area covers by PF2e's rules, which differ from the region's polygon in that spaces are
     * counted whole and cut off by walls. Null if core should measure the region itself.
     * @param level The level whose walls block line of effect, defaulting to the viewed one
     */
    getCoverage(level: Level | null = canvas.level): EffectAreaOffsets | null {
        const key = level?.id ?? "";
        const cached = this.coverageByLevel.get(key);
        if (cached) return cached;
        // A null result means the canvas can't measure right now, so don't cache it
        const computed = this.#measureCoverage(level);
        if (computed) this.coverageByLevel.set(key, computed);
        return computed;
    }

    /**
     * Count the grid spaces this area reaches by PF2e's rules rather than by intersection with its polygon. Walls are
     * per-level, so line of effect is measured against `level`.
     */
    #measureCoverage(level: Level | null): EffectAreaOffsets | null {
        if (!this.isMeasuredArea) return null;
        // Foundry doesn't give cone/line a literal `type`, so the union won't narrow without a cast
        const area = areaCoverage(this.shapes[0] as Parameters<typeof areaCoverage>[0]);

        const { size } = canvas.dimensions;
        const grid = canvas.grid;
        const { i: col0, j: row0 } = grid.getOffset(grid.getCenterPoint(area.searchCenter));
        const span = Math.ceil(area.reach) + 1;

        const covered: GridOffset2D[] = [];
        const blocked: GridOffset2D[] = [];
        const coveredKeys = new Set<string>();
        const key = (offset: GridOffset2D): string => `${offset.i},${offset.j}`;
        for (let a = -span; a <= span; a++) {
            for (let b = -span; b <= span; b++) {
                const { x: gx, y: gy } = grid.getTopLeftPoint({ i: col0 + a, j: row0 + b });
                // Cell center, in pixels
                const destination = { x: gx + size * 0.5, y: gy + size * 0.5 };
                if (destination.x < 0 || destination.y < 0) continue;
                if (!area.contains(destination)) continue;

                // A wall between the origin and the cell center means no line of effect: blocked, not covered
                const offset = { i: col0 + a, j: row0 + b };
                const hasLineOfEffect = !CONFIG.Canvas.polygonBackends.move.testCollision(area.origin, destination, {
                    type: "move",
                    mode: "any",
                    level,
                });
                if (hasLineOfEffect) {
                    covered.push(offset);
                    coveredKeys.add(key(offset));
                } else {
                    blocked.push(offset);
                }
            }
        }

        return { covered, blocked, covers: (offset) => coveredKeys.has(key(offset)) };
    }

    /** Walls moved, line of effect may have changed */
    clearCoverage(): void {
        this.coverageByLevel.clear();
    }

    /** Coverage is stale once the region's data is (re)initialized, drag previews included */
    protected override _initialize(options?: Record<string, unknown>): void {
        this.coverageByLevel = new Map();
        super._initialize(options);
    }

    /** The grid changed beneath the region, or its shape was constrained */
    protected override _onPolygonTreeChange(): void {
        super._onPolygonTreeChange();
        this.clearCoverage();
    }

    /** Ensure the source has a `pf2e` flag along with an `areaShape` if directly inferable. */
    protected override _initializeSource(
        data: object,
        options?: DocumentConstructionContext<TParent>,
    ): this["_source"] {
        const initialized = super._initializeSource(data, options);
        const areaShape = initialized.t === "cone" ? "cone" : initialized.t === "ray" ? "line" : null;
        initialized.flags[SYSTEM_ID] = fu.mergeObject({ areaShape }, initialized.flags[SYSTEM_ID] ?? {});
        return initialized;
    }

    /** If present, show the clear-template button on the message from which this template was spawned */
    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);
        toggleClearEffectAreaButton(this.message);
    }

    /** If present, hide the clear-template button on the message from which this template was spawned */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);
        toggleClearEffectAreaButton(this.message);
    }
}

interface RegionDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends RegionDocument<TParent> {
    readonly behaviors: EmbeddedCollection<SpecificRegionBehavior<this>>;

    get object(): RegionPF2e<this>;

    flags: DocumentFlags & {
        [SYSTEM_ID]: {
            messageId?: string;
            origin?: ItemOriginFlag;
            areaShape: EffectAreaShape | null;
        };
    };
}

export { RegionDocumentPF2e };
export type { EffectAreaOffsets };
