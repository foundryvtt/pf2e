import type { Point } from "@common/_types.d.mts";
import type { CircleShapeData, ConeShapeData, LineShapeData } from "@common/data/data.d.mts";
import { measureDistance } from "@module/canvas/helpers.ts";

/** Per-shape geometry for a template's grid coverage. */
interface AreaCoverage {
    /** Point line of effect is measured from */
    origin: Point;
    /** Center of the cell-search box, in pixels */
    searchCenter: Point;
    /** Half-extent of the search box, in grid squares */
    reach: number;
    /** Whether a cell center lies within the area, before line of effect is checked */
    contains: (destination: Point) => boolean;
}

/** Resolve a template shape into its line-of-effect origin, a cell-search box, and a coverage test. */
function areaCoverage(shape: CircleShapeData | ConeShapeData | LineShapeData): AreaCoverage {
    const { size, distance } = canvas.dimensions;

    if (shape.type === "circle") {
        const circle = shape as CircleShapeData;
        const origin = { x: circle.x, y: circle.y };
        const radius = (circle.radius / size) * distance;
        return {
            origin,
            searchCenter: origin,
            reach: circle.radius / size,
            contains: (destination) => measureDistance(destination, origin) <= radius,
        };
    }

    if (shape.type === "cone") {
        const cone = shape as ConeShapeData;
        const radius = (cone.radius / size) * distance;
        const { origin, contains } = coneCoverage(cone, { x: cone.x, y: cone.y });
        return {
            origin,
            searchCenter: origin,
            reach: cone.radius / size,
            contains: (destination) => contains(destination) && measureDistance(destination, origin) <= radius,
        };
    }

    // A line is a rectangle `length` long and `width` wide running from the origin along its rotation
    const line = shape as LineShapeData;
    const radians = Math.toRadians(line.rotation);
    const along = { x: Math.cos(radians), y: Math.sin(radians) };
    const perpendicular = { x: -along.y, y: along.x };
    const halfWidth = line.width / 2;
    // PF2e lines fire from a grid corner. Step the origin back to that corner along whichever axes it sits mid-cell
    const toCorner = (coord: number, component: number): number =>
        coord % size !== 0 ? coord - Math.sign(Math.round(component * 100)) * (size / 2) : coord;
    const origin = { x: toCorner(line.x, along.x), y: toCorner(line.y, along.y) };
    return {
        origin,
        searchCenter: { x: origin.x + along.x * (line.length / 2), y: origin.y + along.y * (line.length / 2) },
        reach: (line.length / 2 + halfWidth) / size,
        contains: (destination) => {
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;
            const projection = dx * along.x + dy * along.y;
            const offset = dx * perpendicular.x + dy * perpendicular.y;
            return projection >= 0 && projection <= line.length && Math.abs(offset) <= halfWidth;
        },
    };
}

/**
 * Border-aligned apex and wedge test for a cone. The apex is taken as placed: the coordinate perpendicular to the
 * firing direction is left alone, which is what separates a corner-origin cone (perpendicular on a grid line) from
 * a side-origin one.
 */
function coneCoverage(
    shape: ConeShapeData,
    origin: Point,
): { origin: Point; contains: (destination: Point) => boolean } {
    const dimensions = canvas.dimensions;
    const direction = shape.rotation;
    const minAngle = (360 + ((direction - shape.angle * 0.5) % 360)) % 360;
    const maxAngle = (360 + ((direction + shape.angle * 0.5) % 360)) % 360;
    const withinAngle = (value: number): boolean => {
        value = (360 + (value % 360)) % 360;
        return minAngle < maxAngle ? value >= minAngle && value <= maxAngle : value >= minAngle || value <= maxAngle;
    };

    // Offset the origin by half a cell toward the firing direction along each axis it is not already a border of.
    // `dir` is degrees anticlockwise from pointing right, in 45-degree increments from 0 to 360.
    const dir = (direction >= 0 ? 360 - direction : -direction) % 360;
    const xOffset =
        origin.x % dimensions.size !== 0 ? Math.sign(Math.round(Math.cos(Math.toRadians(dir)) * 100)) / 2 : 0;
    // Inverted along Y because screen-space Y increases downward
    const yOffset =
        origin.y % dimensions.size !== 0 ? -Math.sign(Math.round(Math.sin(Math.toRadians(dir)) * 100)) / 2 : 0;
    const coneOrigin = { x: origin.x + xOffset * dimensions.size, y: origin.y + yOffset * dimensions.size };

    return {
        origin: coneOrigin,
        contains: (destination: Point): boolean => {
            const ray = new fc.geometry.Ray(coneOrigin, destination);
            const rayAngle = (360 + ((ray.angle / (Math.PI / 180)) % 360)) % 360;
            return ray.distance === 0 || withinAngle(rayAngle);
        },
    };
}

export { areaCoverage };
export type { AreaCoverage };
