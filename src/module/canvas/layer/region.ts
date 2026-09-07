import type {
    PlaceablesLayerEvent,
    PlaceablesLayerPointerEvent,
} from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { ConeShapeData, LineShapeData, RingShapeData, SpecificShapeData } from "@common/data/data.d.mts";
import { RegionDocumentPF2e } from "@scene";
import { RegionPF2e } from "../index.ts";

/** Cones fire along the eight grid directions; lines can be aimed at any cell, so they step much finer. */
const directionSnap = (type: string): number => (type === "cone" ? 45 : 5);
const isAimable = (type: string): boolean => type === "cone" || type === "line";

export class RegionLayerPF2e extends fc.layers.RegionLayer<RegionPF2e> {
    override placeRegion(
        data: DeepPartial<fd.RegionSource>,
        options: fc.layers.RegionPlacementOptions<RegionPF2e> = {},
    ): Promise<RegionDocumentPF2e | null> {
        if (data.displayMeasurements && data.highlightMode === "coverage") {
            // Cones and lines place in two steps: a click drops the origin, then the cursor aims them
            const placement = { aiming: false };

            options.onMove = ({ event, position, preview, shape, snap }) => {
                if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return;
                if (placement.aiming && isAimable(shape.type)) {
                    // Point the shape at the cursor instead of dragging its origin around. Ctrl rotates freely
                    const placed = shape as ConeShapeData | LineShapeData;
                    const angle = Math.toDegrees(Math.atan2(position.y - placed.y, position.x - placed.x));
                    const snapped = event.ctrlKey || event.metaKey ? angle : angle.toNearest(directionSnap(shape.type));
                    placed.updateSource({ rotation: snapped });
                    return false;
                }
                if (!snap) return;
                const { x, y } = canvas.grid.getSnappedPoint(position, { mode: preview.snappingMode });
                position.x = x;
                position.y = y;
                return;
            };

            // Mouse wheel nudges the direction in the same increments. Ctrl nudges freely in 5-degree steps
            options.onRotate = ({ event, shape }) => {
                if (!isAimable(shape.type) || canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return;
                const placed = shape as ConeShapeData | LineShapeData;
                const free = event.ctrlKey || event.metaKey;
                const step = free ? 5 : directionSnap(shape.type);
                const delta = step * Math.sign(event.deltaY);
                const rotation = placed.rotation + delta;
                placed.updateSource({ rotation: free ? rotation : rotation.toNearest(step) });
                return false;
            };

            // First click sets the origin and switches to aiming; the second click confirms. Shift places directly
            options.preConfirm = ({ event, shape }) => {
                const aim = isAimable(shape.type) && canvas.grid.type === CONST.GRID_TYPES.SQUARE && !event.shiftKey;
                if (!placement.aiming && aim) {
                    placement.aiming = true;
                    return false;
                }
                return undefined;
            };

            // Right-click while aiming drops back to moving the origin rather than cancelling
            options.preSkip = () => {
                if (placement.aiming) {
                    placement.aiming = false;
                    return false;
                }
                return undefined;
            };
        }
        return super.placeRegion(data, options);
    }

    /** Snap a cone or line direction while drawing a template with the region tools. */
    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<RegionPF2e>): void {
        super._onDragLeftMove(event);
        // Only template-mode draws are measured templates; leave plain region shapes alone
        if (!this.templateMode || canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return;
        const shape = (event.interactionData as { shape?: { type: string } }).shape;
        if (!shape || !isAimable(shape.type)) return;
        const placed = shape as ConeShapeData | LineShapeData;
        const rotation = placed.rotation.toNearest(directionSnap(shape.type));
        if (rotation !== placed.rotation) {
            placed.updateSource({ rotation });
            this._updateDragPreview(event);
        }
    }

    /** Fit an emanation region shape base to underlying token while drawing with the region tools. */
    protected override _createDragShapeData(
        event: PlaceablesLayerEvent<RegionPF2e>,
    ): DeepPartial<Exclude<SpecificShapeData, RingShapeData>["_source"]> {
        const shape = super._createDragShapeData(event);
        if (!this.templateMode || shape.type !== "emanation" || shape.base?.type !== "token") return shape;
        const { x, y } = event.interactionData.origin;
        const tokens = canvas.tokens.quadtree
            .getObjects(new PIXI.Rectangle(x, y, 0, 0))
            .values()
            .filter((t) => t.actor?.isOfType("creature", "army", "hazard"))
            .toArray();
        if (tokens.length === 1) {
            const token = tokens[0].document;
            const base = shape.base;
            base.shape = token.shape;
            base.width = token.width;
            base.height = token.height;
            event.interactionData.origin = token.getCenterPoint();
        }
        return shape;
    }
}
