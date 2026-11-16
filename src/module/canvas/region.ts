import type { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { Point } from "@common/_types.d.mts";
import type { GridSnappingMode } from "@common/constants.d.mts";
import type { GridOffset2D } from "@common/grid/_types.d.mts";
import { EffectAreaShape } from "@item/types.ts";
import type { RegionDocumentPF2e } from "@scene/region-document/document.ts";

/** Add support for drag/drop repositioning of regions. */
class RegionPF2e<TDocument extends RegionDocumentPF2e = RegionDocumentPF2e> extends fc.placeables.Region<TDocument> {
    /** Squares in range but walled off from the origin, shaded as blocked rather than covered */
    #blockedOffsets: GridOffset2D[] = [];

    /** Graphics for the blocked-square shading */
    #blockedHighlight: PIXI.Graphics | null = null;

    get snappingMode(): GridSnappingMode {
        const MODES = CONST.GRID_SNAPPING_MODES;
        switch (this.areaShape) {
            case "burst":
                return MODES.VERTEX;
            case "cone":
                return (MODES.CENTER | MODES.VERTEX | MODES.EDGE_MIDPOINT) as GridSnappingMode;
            case "line":
                return (MODES.EDGE_MIDPOINT | MODES.VERTEX) as GridSnappingMode;
            default:
                return (MODES.CENTER | MODES.VERTEX) as GridSnappingMode;
        }
    }

    get areaShape(): EffectAreaShape | null {
        return this.document.flags[SYSTEM_ID].areaShape ?? null;
    }

    override getSnappedPosition(position?: Point): Point {
        return this.layer.getSnappedPoint(position ?? this.center);
    }

    /** Cover the squares a burst, cone, or line effect area reaches, counted by PF2e's grid rules. */
    protected override _getCoveredGridSpaceOffsets(): GridOffset2D[] {
        const coverage = this.document.getCoverage();
        this.#blockedOffsets = coverage?.blocked ?? [];
        return coverage?.covered ?? super._getCoveredGridSpaceOffsets();
    }

    override async _draw(options?: object): Promise<void> {
        await super._draw(options);
        const highlights = (this.layer as unknown as fc.layers.RegionLayer)._highlights;
        this.#blockedHighlight = highlights.addChild(new PIXI.Graphics());
        this.#drawBlockedHighlight();
    }

    /** Shade the in-range squares a wall cuts off from the origin. */
    #drawBlockedHighlight(): void {
        const graphics = this.#blockedHighlight;
        if (!graphics) return;
        graphics.clear();
        graphics.visible = this.visible;
        graphics.zIndex = this.zIndex;
        const { sizeX, sizeY } = canvas.grid;
        for (const offset of this.#blockedOffsets) {
            const { x, y } = canvas.grid.getTopLeftPoint(offset);
            graphics
                .beginFill(0x000000, 0.5)
                .drawRect(x, y, sizeX, sizeY)
                .endFill()
                .lineStyle(1, 0x000000, 0.5)
                .moveTo(x, y)
                .lineTo(x + sizeX, y + sizeY);
        }
    }

    override _applyRenderFlags(flags: Record<string, boolean>): void {
        super._applyRenderFlags(flags);
        if (flags.refreshGeometry || flags.refreshVisibility) this.#drawBlockedHighlight();
    }

    override _clear(): void {
        this.#blockedHighlight?.destroy();
        this.#blockedHighlight = null;
        super._clear();
    }

    override _destroy(options?: boolean | PIXI.IDestroyOptions): void {
        this.#blockedHighlight?.destroy();
        this.#blockedHighlight = null;
        super._destroy(options);
    }

    /** Save the coordinates of the new drop location(s). */
    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<TDocument[]>;
    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<RegionDocument[]> {
        const handle = event.interactionData.handle;
        if (handle) return handle.controls._onDragDrop(event) ?? [];
        const clones = event.interactionData.clones ?? [];
        const updates = clones.map((clone) => {
            const shapes = clone.document.shapes.map((s) => s.toObject(false));
            return { _id: clone.document.id, shapes };
        });

        return this.document.parent?.updateEmbeddedDocuments("Region", updates) ?? [];
    }
}

export { RegionPF2e };
