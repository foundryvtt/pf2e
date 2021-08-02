import { MeasuredTemplateDocumentPF2e } from "@module/scene/measured-template-document";
import { TemplateLayerPF2e } from "./template-layer";

class MeasuredTemplatePF2e extends MeasuredTemplate<MeasuredTemplateDocumentPF2e> {
    get type(): MeasuredTemplateType {
        return this.data.t;
    }

    /** Highlight grid according to Pathfinder 2e effect-area shapes */
    override highlightGrid(): void {
        if (!["circle", "cone"].includes(this.data.t)) {
            return super.highlightGrid();
        }

        const grid = canvas.grid;
        const dimensions = canvas.dimensions;

        // Only highlight for objects which have a defined shape
        if (!this.id || !this.shape) return;

        // Clear existing highlight
        const highlightLayer = grid.getHighlightLayer(`Template.${this.id}`)?.clear();

        // Get the center of the grid position occupied by the template
        const x = this.data.x;
        const y = this.data.y;

        const [cx, cy] = grid.getCenter(x, y);
        const [col0, row0] = grid.grid.getGridPositionFromPixels(cx, cy);
        const minAngle = (360 + ((this.data.direction - this.data.angle * 0.5) % 360)) % 360;
        const maxAngle = (360 + ((this.data.direction + this.data.angle * 0.5) % 360)) % 360;

        const withinAngle = (min: number, max: number, value: number) => {
            min = (360 + (min % 360)) % 360;
            max = (360 + (max % 360)) % 360;
            value = (360 + (value % 360)) % 360;

            if (min < max) return value >= min && value <= max;
            return value >= min || value <= max;
        };

        const originOffset = { x: 0, y: 0 };
        // Offset measurement for cones
        // Offset is to ensure that cones only start measuring from cell borders, as in https://www.d20pfsrd.com/magic/#Aiming_a_Spell
        if (this.data.t === "cone") {
            // Degrees anticlockwise from pointing right. In 45-degree increments from 0 to 360
            const dir = (this.data.direction >= 0 ? 360 - this.data.direction : -this.data.direction) % 360;
            // If we're not on a border for X, offset by 0.5 or -0.5 to the border of the cell in the direction we're looking on X axis
            const xOffset =
                this.data.x % dimensions.size !== 0
                    ? Math.sign((1 * Math.round(Math.cos(Math.toRadians(dir)) * 100)) / 100) / 2
                    : 0;
            // Same for Y, but cos Y goes down on screens, we invert
            const yOffset =
                this.data.y % dimensions.size !== 0
                    ? -Math.sign((1 * Math.round(Math.sin(Math.toRadians(dir)) * 100)) / 100) / 2
                    : 0;
            originOffset.x = xOffset;
            originOffset.y = yOffset;
        }

        // Point we are measuring distances from
        let origin = {
            x: this.data.x + originOffset.x * dimensions.size,
            y: this.data.y + originOffset.y * dimensions.size,
        };

        // Get number of rows and columns
        const rowCount = Math.ceil((this.data.distance * 1.5) / dimensions.distance / (dimensions.size / grid.h));
        const columnCount = Math.ceil((this.data.distance * 1.5) / dimensions.distance / (dimensions.size / grid.w));

        for (let a = -columnCount; a < columnCount; a++) {
            for (let b = -rowCount; b < rowCount; b++) {
                // Position of cell's top-left corner, in pixels
                const [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(col0 + a, row0 + b);
                // Position of cell's center, in pixels
                const [cellCenterX, cellCenterY] = [gx + dimensions.size * 0.5, gy + dimensions.size * 0.5];

                // Determine point of origin
                origin = { x: this.data.x, y: this.data.y };
                origin.x += originOffset.x * dimensions.size;
                origin.y += originOffset.y * dimensions.size;

                const ray = new Ray(origin, { x: cellCenterX, y: cellCenterY });

                const rayAngle = (360 + ((ray.angle / (Math.PI / 180)) % 360)) % 360;
                if (this.data.t === "cone" && ray.distance > 0 && !withinAngle(minAngle, maxAngle, rayAngle)) {
                    continue;
                }

                // Determine point we're measuring the distance to - always in the center of a grid square
                const destination = { x: cellCenterX, y: cellCenterY };

                const distance = this.measureDistance(destination, origin);
                if (highlightLayer && distance <= this.data.distance) {
                    const color = this.fillColor;
                    const border = this.borderColor;
                    grid.grid.highlightGridPosition(highlightLayer, { x: gx, y: gy, color, border });
                }
            }
        }
    }

    /** Measure distance using Pathfinder 2e grid-counting rules */
    static measureDistance(p0: Point, p1: Point): number {
        const gs = canvas.dimensions.size;
        const ray = new Ray(p0, p1);
        const nx = Math.ceil(Math.abs(ray.dx / gs));
        const ny = Math.ceil(Math.abs(ray.dy / gs));

        // Get the number of straight and diagonal moves
        const nDiagonal = Math.min(nx, ny);
        const nStraight = Math.abs(ny - nx);

        // Diagonals in PF pretty much count as 1.5 times a straight
        const distance = Math.floor(nDiagonal * 1.5 + nStraight);
        const distanceOnGrid = distance * canvas.dimensions.distance;

        return distanceOnGrid;
    }

    private measureDistance(p0: Point, p1: Point): number {
        return MeasuredTemplatePF2e.measureDistance(p0, p1);
    }
}

interface MeasuredTemplatePF2e extends MeasuredTemplate<MeasuredTemplateDocumentPF2e> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
