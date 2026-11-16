import type {
    DatabaseCreateCallbackOptions,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
} from "@common/abstract/_types.d.mts";
import type { ScenePF2e } from "@scene";

/** Source keys that change a wall's edge, and with it what the wall blocks */
const EDGE_KEYS = ["c", "levels", "light", "move", "sight", "sound", "dir", "door", "ds", "threshold"] as const;

class WallDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends WallDocument<TParent> {
    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);
        this.#onEdgeChange();
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);
        if (EDGE_KEYS.some((k) => k in changed)) this.#onEdgeChange();
    }

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);
        this.#onEdgeChange();
    }

    /**
     * Line of effect is part of an effect area's coverage, so a wall can move tokens in or out of one without the
     * region changing. Core only rechecks containment when a region or token changes.
     */
    #onEdgeChange(): void {
        const scene = this.parent;
        if (scene !== canvas.scene) return;
        const areas = scene?.regions.filter((r) => r.isMeasuredArea) ?? [];
        if (areas.length === 0) return;

        for (const area of areas) {
            area.clearCoverage();
            area.object?.renderFlags.set({ refreshGeometry: true });
        }
        if (game.user.isActiveGM) scene?.updateTokenRegions();
    }
}

export { WallDocumentPF2e };
