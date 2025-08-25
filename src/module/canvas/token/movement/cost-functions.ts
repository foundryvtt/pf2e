const flyActionMovementCost = (
    cost: number,
    from: Readonly<foundry.grid.GridOffset3D>,
    to: Readonly<foundry.grid.GridOffset3D>,
    _distance: number,
    segment: DeepReadonly<fd.TokenMovementSegmentData>,
): number => {
    if (!canvas.grid.isSquare) return cost;
    // Moving upward (straight up or diagonally) uses the rules for moving through difficult terrain.
    if (to.k > from.k) {
        // If the region already is difficult terrain let the region handle the calculation
        if ((segment.terrain?.difficulty ?? 0) > 1) return cost;
        return cost + canvas.grid.distance;
    }
    return cost;
};

export { flyActionMovementCost };
