import type { TokenPF2e } from "./index.ts";

/**
 * Measure the minimum distance between two rectangles
 * @param r0      The origin rectangle
 * @param r1      The destination rectangle
 * @param [reach] If this is a reach measurement, the origin actor's reach
 */
function measureDistanceCuboid(
    r0: PIXI.Rectangle,
    r1: PIXI.Rectangle,
    {
        reach = null,
        token = null,
        target = null,
    }: {
        reach?: number | null;
        token?: TokenPF2e | null;
        target?: TokenPF2e | null;
    } = {},
): number {
    if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
        return canvas.grid.measurePath([r0, r1]).distance;
    }

    const gridWidth = canvas.grid.sizeX;

    const distance = {
        dx: 0,
        dy: 0,
        dz: 0,
    };
    // Return early if the rectangles overlap
    const rectanglesOverlap = [
        [r0, r1],
        [r1, r0],
    ].some(([rA, rB]) => rB.right > rA.left && rB.left < rA.right && rB.bottom > rA.top && rB.top < rA.bottom);
    if (rectanglesOverlap) {
        distance.dx = 0;
        distance.dy = 0;
    } else {
        // Snap the dimensions and position of the rectangle to grid square units
        const snapBounds = (rectangle: PIXI.Rectangle, { toward }: { toward: PIXI.Rectangle }): PIXI.Rectangle => {
            const roundLeft = rectangle.left < toward.left ? Math.ceil : Math.floor;
            const roundTop = rectangle.top < toward.top ? Math.ceil : Math.floor;

            const left = roundLeft(rectangle.left / gridWidth) * gridWidth;
            const top = roundTop(rectangle.top / gridWidth) * gridWidth;
            const width = Math.ceil(rectangle.width / gridWidth) * gridWidth;
            const height = Math.ceil(rectangle.height / gridWidth) * gridWidth;

            return new PIXI.Rectangle(left, top, width, height);
        };

        // Find the minimum distance between the rectangles for each dimension
        const r0Snapped = snapBounds(r0, { toward: r1 });
        const r1Snapped = snapBounds(r1, { toward: r0 });
        distance.dx = Math.max(r0Snapped.left - r1Snapped.right, r1Snapped.left - r0Snapped.right, 0) + gridWidth;
        distance.dy = Math.max(r0Snapped.top - r1Snapped.bottom, r1Snapped.top - r0Snapped.bottom, 0) + gridWidth;
    }

    if (token && target && token.document.elevation !== target.document.elevation && token.actor && target.actor) {
        const selfElevation = token.document.elevation;
        const targetElevation = target.document.elevation;

        const [selfDimensions, targetDimensions] = [token.actor.dimensions, target.actor.dimensions];

        const gridSize = canvas.dimensions.size;
        const gridDistance = canvas.dimensions.distance;

        const elevation0 = Math.floor((selfElevation / gridDistance) * gridSize);
        const height0 = Math.floor((selfDimensions.height / gridDistance) * gridSize);
        const elevation1 = Math.floor((targetElevation / gridDistance) * gridSize);
        const height1 = Math.floor((targetDimensions.height / gridDistance) * gridSize);

        // simulate xz plane
        const xzPlane = {
            self: new PIXI.Rectangle(r0.x, elevation0, r0.width, height0),
            target: new PIXI.Rectangle(r1.x, elevation1, r1.width, height1),
        };

        // check for overlappig
        const elevationOverlap = [
            [xzPlane.self, xzPlane.target],
            [xzPlane.target, xzPlane.self],
        ].some(([rA, rB]) => rB.bottom > rA.top && rB.top < rA.bottom);
        if (elevationOverlap) {
            distance.dz = 0;
        } else {
            // Snap the dimensions and position of the rectangle to grid square units
            const snapBounds = (rectangle: PIXI.Rectangle, { toward }: { toward: PIXI.Rectangle }): PIXI.Rectangle => {
                const roundLeft = rectangle.left < toward.left ? Math.ceil : Math.floor;
                const roundTop = rectangle.top < toward.top ? Math.ceil : Math.floor;

                const left = roundLeft(rectangle.left / gridWidth) * gridWidth;
                const top = roundTop(rectangle.top / gridWidth) * gridWidth;
                const width = Math.ceil(rectangle.width / gridWidth) * gridWidth;
                const height = Math.ceil(rectangle.height / gridWidth) * gridWidth;

                return new PIXI.Rectangle(left, top, width, height);
            };

            // Find the minimum distance between the rectangles for each dimension
            const r0Snapped = snapBounds(xzPlane.self, { toward: xzPlane.target });
            const r1Snapped = snapBounds(xzPlane.target, { toward: xzPlane.self });
            distance.dz = Math.max(r0Snapped.top - r1Snapped.bottom, r1Snapped.top - r0Snapped.bottom, 0) + gridWidth;
        }
    } else {
        distance.dz = 0;
    }

    return measureDistanceOnGrid(distance, { reach });
}

/**
 * Measure distance using Pathfinder 2e grid-counting rules
 * @param p0 The origin point
 * @param p1 The destination point
 */
function measureDistance(p0: Point, p1: Point): number {
    if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
        return canvas.grid.measurePath([p0, p1]).distance;
    }

    return measureDistanceOnGrid(new Ray(p0, p1));
}

/**
 * Given the distance in each dimension, measure the distance in grid units
 * @param segment A pair of x/y distances constituting the line segment between two points
 * @param [reach] If this is a reach measurement, the origin actor's reach
 */
function measureDistanceOnGrid(
    segment: { dx: number; dy: number; dz?: number | null },
    { reach = null }: { reach?: number | null } = {},
): number {
    if (!canvas.dimensions) return NaN;

    const gridSize = canvas.dimensions.size;
    const gridDistance = canvas.dimensions.distance;

    const nx = Math.ceil(Math.abs(segment.dx / gridSize));
    const ny = Math.ceil(Math.abs(segment.dy / gridSize));
    const nz = Math.ceil(Math.abs((segment.dz || 0) / gridSize));

    // ingore the lowest difference
    const sortedDistance = [nx, ny, nz].sort((a, b) => a - b);
    // Get the number of straight and diagonal moves
    const squares = {
        doubleDiagonal: sortedDistance[0],
        diagonal: sortedDistance[1] - sortedDistance[0],
        straight: sortedDistance[2] - sortedDistance[1],
    };

    // "Unlike with measuring most distances, 10-foot reach can reach 2 squares diagonally." (CRB pg 455)
    const reduction = squares.diagonal + squares.doubleDiagonal > 1 && reach === 10 ? 1 : 0;

    // Diagonals in PF pretty much count as 1.5 times a straight
    // for diagonals across the x, y, and z axis count it as 1.75 as a best guess
    const distance = Math.floor(squares.doubleDiagonal * 1.75 + squares.diagonal * 1.5 + squares.straight) - reduction;

    return distance * gridDistance;
}

/** Get a grid square at an arbitrary point. */
function squareAtPoint(point: Point): PIXI.Rectangle {
    const snapped =
        canvas.grid.type === CONST.GRID_TYPES.SQUARE
            ? canvas.grid.getTopLeftPoint(point)
            : canvas.grid.getSnappedPoint(point, { mode: CONST.GRID_SNAPPING_MODES.CENTER });

    return new PIXI.Rectangle(snapped.x, snapped.y, canvas.grid.sizeX, canvas.grid.sizeY);
}

export { measureDistance, measureDistanceCuboid, squareAtPoint };
