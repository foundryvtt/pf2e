import type { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { Point } from "@common/_types.d.mts";
import type { GridSnappingMode } from "@common/constants.d.mts";
import { EffectAreaShape } from "@item/types.ts";
import type { RegionDocumentPF2e } from "@scene/region-document/document.ts";

/** Add support for drag/drop repositioning of regions. */
class RegionPF2e<TDocument extends RegionDocumentPF2e = RegionDocumentPF2e> extends fc.placeables.Region<TDocument> {
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

    /** Save the coordinates of the new drop location(s). */
    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<TDocument[]>;
    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<RegionDocument[]> {
        const clones = event.interactionData.clones ?? [];
        const updates = clones.map((clone) => {
            const shapes = clone.document.shapes.map((s) => s.toObject(false));
            return { _id: clone.document.id, shapes };
        });

        return this.document.parent?.updateEmbeddedDocuments("Region", updates) ?? [];
    }
}

export { RegionPF2e };
