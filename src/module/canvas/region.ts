import type { RegionDocumentPF2e } from "@scene/region-document/document.ts";

/** Add support for drag/drop repositioning of regions. */
class RegionPF2e extends Region<RegionDocumentPF2e> {
    static override RENDER_FLAGS = { ...super.RENDER_FLAGS, refreshPosition: {} };

    protected override _canDrag(user: User, event: PIXI.FederatedPointerEvent): boolean {
        return this._canControl(user, event) && !this.document.locked;
    }

    override getSnappedPosition(position?: Point): Point {
        return this.layer.getSnappedPoint(position ?? this.center);
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
                { shapes: clone.document.shapes.map((s) => s.toObject(false)) },
                { broadcast: false, updates: [] },
                game.user.id,
            );
            Promise.resolve().then(() => {
                clone.visible = true;
            });
        }
    }

    /** Save the coordinates of the new drop location. */
    protected override async _onDragLeftDrop(
        event: PlaceablesLayerPointerEvent<this>,
    ): Promise<void | RegionDocumentPF2e[]> {
        const clone = event.interactionData.clones?.[0];
        const shapes = clone?.document.shapes.map((shape) => {
            if ("x" in shape) {
                shape.updateSource({ x: shape.x, y: shape.y });
            } else if ("points" in shape) {
                shape.updateSource({ points: shape.points });
            }

            return shape.toObject();
        });

        await this.document.update({ shapes });
    }
}

export { RegionPF2e };
