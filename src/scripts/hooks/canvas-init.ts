export const CanvasInit = {
    listen: (): void => {
        Hooks.on("canvasInit", async (canvas) => {
            /**
             * Activate certain behaviors on Canvas Initialization hook (thanks for MooMan for this snippet)
             * Double every other diagonal movement
             */
            SquareGrid.prototype.measureDistances = function measureDistances(
                segments: Segment[],
                options: MeasureDistancesOptions = {}
            ) {
                if (!options.gridSpaces) return BaseGrid.prototype.measureDistances.call(this, segments, options);

                // Track the total number of diagonals
                let nDiagonal = 0;
                const d = canvas.dimensions;

                // Iterate over measured segments
                return segments.map((s) => {
                    const r = s.ray;

                    // Determine the total distance traveled
                    const nx = Math.abs(Math.ceil(r.dx / d.size));
                    const ny = Math.abs(Math.ceil(r.dy / d.size));

                    // Determine the number of straight and diagonal moves
                    const nd = Math.min(nx, ny);
                    const ns = Math.abs(ny - nx);
                    nDiagonal += nd;

                    const nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
                    const spaces = nd10 * 2 + (nd - nd10) + ns;
                    return spaces * canvas.dimensions.distance;
                });
            };
        });
    },
};
