import type { ElevatedPoint } from "@common/_types.d.mts";
import * as R from "remeda";

export class RulerPF2e extends fc.interaction.Ruler {
    override get path(): readonly Readonly<ElevatedPoint>[] {
        return super.path;
    }

    override set path(value: ElevatedPoint[]) {
        const origin = value[0];
        if (!origin || !canvas.grid.isSquare || game.keyboard.isModifierActive("Shift")) {
            super.path = value;
            return;
        }
        if (R.isDeepEqual(super.path, value)) return;

        const gridSize = canvas.grid.size;
        const snappedOrigin = { ...RulerPF2e.getSnappedPoint(origin), elevation: origin.elevation };
        const nearest = { x: snappedOrigin.x % gridSize, y: snappedOrigin.y % gridSize };
        super.path = value.map((p) =>
            R.isDeepEqual(p, origin)
                ? snappedOrigin
                : {
                      x: Math.floor(p.x / gridSize) * gridSize + nearest.x,
                      y: Math.floor(p.y / gridSize) * gridSize + nearest.y,
                      elevation: p.elevation,
                  },
        );
    }
}
