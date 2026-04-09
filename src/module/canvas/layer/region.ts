import { RegionDocumentPF2e } from "@scene";
import { RegionPF2e } from "../index.ts";

export class RegionLayerPF2e extends fc.layers.RegionLayer<RegionPF2e> {
    override placeRegion(
        data: DeepPartial<fd.RegionSource>,
        options: fc.layers.RegionPlacementOptions<RegionPF2e> = {},
    ): Promise<RegionDocumentPF2e | null> {
        if (data.displayMeasurements && data.highlightMode === "coverage") {
            options.onMove = ({ position, preview, snap }) => {
                if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE || !snap) return;
                const snappingMode = (preview as RegionPF2e).snappingMode;
                const { x, y } = canvas.grid.getSnappedPoint(position, { mode: snappingMode });
                position.x = x;
                position.y = y;
            };
        }
        return super.placeRegion(data, options);
    }
}
