import type { ElevatedPoint } from "@common/_types.d.mts";

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
        const snappedOrigin = { ...RulerPF2e.getSnappedPoint(origin), elevation: origin.elevation };
        const gridSize = canvas.grid.size;
        const nearest = { x: snappedOrigin.x % gridSize, y: snappedOrigin.y % gridSize };
        super.path = value.map((point) => {
            if (point.x === origin.x && point.y === origin.y && point.elevation === origin.elevation) {
                return { ...snappedOrigin };
            }
            const snappedPoint = {
                x: Math.floor(point.x / gridSize) * gridSize + nearest.x,
                y: Math.floor(point.y / gridSize) * gridSize + nearest.y,
            };
            return Object.assign(point, snappedPoint);
        });
    }
}
