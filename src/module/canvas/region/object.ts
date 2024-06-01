class RegionPF2e<TParent extends RegionDocument = RegionDocument> extends Region<TParent> {
    override testPoint(point: Point, elevation?: number): boolean {
        if (
            canvas.grid.type !== CONST.GRID_TYPES.SQUARE ||
            this.document.behaviors.some((b) => b.isOfType("teleportToken"))
        ) {
            return super.testPoint(point, elevation);
        }

        // The tested point might be the post-update token position so we need to find the token that will be moving
        const token = canvas.tokens.documentCollection?.find((t) => {
            if (!t.newPosition || !t.object) return false;
            const center = t.object.getCenterPoint({ x: t.newPosition.x, y: t.newPosition.y });
            if (center.x === point.x && center.y === point.y) return true;
            return false;
        });
        if (token) {
            return (
                (elevation === undefined || (this.bottom <= elevation && elevation <= this.top)) &&
                !!token.object?.getGridSquaresFromCenterPoint(point).some((p) => this.polygonTree.testPoint(p))
            );
        }

        return super.testPoint(point, elevation);
    }
}

export { RegionPF2e };
