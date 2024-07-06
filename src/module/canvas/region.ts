import type { RegionDocumentPF2e } from "@scene/region-document/document.ts";
import type { RegionSource } from "types/foundry/common/documents/region.d.ts";

/** Add support for drag/drop repositioning of regions. */
class RegionPF2e<TDocument extends RegionDocumentPF2e = RegionDocumentPF2e> extends Region<TDocument> {
    static override RENDER_FLAGS = { ...super.RENDER_FLAGS, refreshPosition: {} };

    override getSnappedPosition(position?: Point): Point {
        return this.layer.getSnappedPoint(position ?? this.center);
    }

    protected override _canDrag(user: User, event: PIXI.FederatedPointerEvent): boolean {
        return this._canControl(user, event) && !this.document.locked;
    }

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<this>): void {
        const { destination, clones = [] } = event.interactionData;

        // Pan the canvas if the drag event approaches the edge
        canvas._onDragCanvasPan(event);

        // Determine dragged distance
        const origin = this.center;
        const dx = destination.x - origin.x;
        const dy = destination.y - origin.y;

        // Update the position of each clone
        for (const clone of clones) {
            const original = clone._original;
            if (!original) continue;
            const position = {
                x: original.document.x + dx,
                y: original.document.y + dy,
            };
            clone.document.x = position.x;
            clone.document.y = position.y;
            clone._onUpdate(
                { shapes: clone.document.shapes.map((s) => s.toObject(false)) } as DeepPartial<RegionSource>,
                { broadcast: false, updates: [] },
                game.user.id,
            );
            Promise.resolve().then(() => {
                clone.visible = true;
            });
        }
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
