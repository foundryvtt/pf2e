import * as R from "remeda";
import { TokenPF2e } from "../object.ts";
import { AuraRenderer } from "./renderer.ts";
import { createTestPolygons } from "./util.ts";

export class AuraRenderers extends Map<string, AuraRenderer> {
    readonly token: TokenPF2e;

    constructor(token: TokenPF2e) {
        super();
        this.token = token;
    }

    /** The ID of the highlight layer for this aura's token */
    get highlightId(): string {
        return this.token.highlightId;
    }

    /**
     * Clear current aura renders, acquire new aura data, and render.
     * @param [slugs] A specific list of slugs to limit which auras are cleared
     */
    async reset(slugs?: string[]): Promise<void> {
        if (!slugs) {
            this.clear();
        } else {
            for (const slug of slugs) {
                this.delete(slug);
            }
        }

        if (!this.token.actor) return;

        const data = Array.from(this.token.document.auras.values()).filter((a) => slugs?.includes(a.slug) ?? true);
        for (const datum of data) {
            const renderer = new AuraRenderer({ ...datum, token: this.token });
            this.set(datum.slug, this.token.addChild(renderer));
        }

        return this.draw();
    }

    /** Reposition aura textures after the token moves. */
    refreshPositions(): void {
        for (const aura of this.values()) {
            aura.repositionTexture();
        }
    }

    /** Whether auras' borders and highlights should be shown to the present user */
    get #showBordersHighlights(): boolean {
        const inEncounter = () =>
            !!(this.token.actor?.isOfType("familiar")
                ? this.token.actor.master?.combatant?.encounter.active
                : this.token.combatant?.encounter.active);

        return (
            canvas.scene?.grid.type === CONST.GRID_TYPES.SQUARE &&
            // Assume if token vision is disabled then the scene is not intended for play.
            canvas.scene.tokenVision &&
            // The scene must be active, or a GM must be the only user logged in.
            canvas.scene.isInFocus &&
            // To be rendered to a player, the aura must emanate from an ally.
            (game.user.isGM || this.token.actor?.alliance === "party") &&
            (this.token.controlled || this.token.hover || this.token.layer.highlightObjects || inEncounter())
        );
    }

    /** Toggle visibility of aura rings and reset highlights */
    async draw(): Promise<void> {
        if (this.size === 0) return;

        this.clearHighlights();
        if (this.token.isAnimating) return;

        const showBordersHighlights = this.#showBordersHighlights;
        for (const aura of this.values()) {
            await aura.draw(showBordersHighlights);
        }

        if (showBordersHighlights && (this.token.hover || this.token.layer.highlightObjects)) {
            const highlightId = this.highlightId;
            const highlight =
                canvas.interface.grid.highlightLayers[highlightId] ??
                canvas.interface.grid.addHighlightLayer(highlightId);
            highlight.clear();
            // Reuse the largest aura's polygons for multiple auras
            if (this.size > 1) {
                const testPolygons = this.#createGroupedPolygons();
                for (const aura of this.values()) {
                    const polygons = testPolygons[aura.restrictionType];
                    if (polygons.length > 0) {
                        aura.polygons = polygons;
                    }
                }
            }
            // Always draw highlight from largest to smallest radius
            for (const aura of [...this.values()].sort((a, b) => a.radius - b.radius)) {
                aura.highlight();
            }
        }
    }

    /** Create test polygons for the largest aura grouped by wall restriction type */
    #createGroupedPolygons(): TestPolygons {
        const polygons: TestPolygons = {
            move: [],
            sight: [],
            sound: [],
        };
        const grouped = R.groupBy(
            [...this.values()].sort((a, b) => a.radius - b.radius),
            (r) => r.restrictionType,
        );
        for (const [type, renderers] of R.entries(grouped)) {
            if (polygons[type].length > 0) continue;
            const renderer = renderers.at(0);
            if (!renderer) continue;
            polygons[type] = createTestPolygons(renderer);
        }
        return polygons;
    }

    /** Deallocate the aura's GPU memory before removing from map */
    override delete(key: string): boolean {
        const aura = this.get(key);
        if (!aura) return false;
        if (!aura.destroyed) aura.destroy(true);
        this.token.removeChild(aura);

        return super.delete(key);
    }

    /** Destroy highlight layer and renderers before clearing the map. */
    override clear(): void {
        this.clearHighlights();
        for (const aura of this.values()) {
            if (!aura.destroyed) aura.destroy(true);
            this.token.removeChild(aura);
        }

        return super.clear();
    }

    /** Alias of `clear` */
    destroy(): void {
        this.clear();
    }

    clearHighlights(): void {
        canvas.interface.grid.destroyHighlightLayer(this.highlightId);
    }
}

type TestPolygons = Record<AuraRenderer["restrictionType"], ClockwiseSweepPolygon[]>;
