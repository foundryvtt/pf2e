import { AreaEffectPreview } from './base';

function calcAngle(foR: Point, cursor: Point): number {
    const delta = {
        x: foR.x - cursor.x,
        y: foR.y - cursor.y,
    };
    const angle = Math.PI + Math.atan2(delta.y, delta.x);
    return (angle * 180) / Math.PI;
}

export class ConePreview extends AreaEffectPreview {
    protected get startPosition() {
        return this.token;
    }

    protected get onMouseMove() {
        let moveTime = Date.now();
        return (event: PIXI.interaction.InteractionEvent) => {
            event.stopPropagation();

            // Apply a 25ms throttle
            const now = Date.now();
            if (now - moveTime <= 25) return;
            moveTime = now;

            const cursor = event.data.getLocalPosition(canvas.templates);

            const gridSize = canvas.grid.size;
            const halfGridSize = gridSize / 2;
            const snapped = canvas.grid.getSnappedPosition(cursor.x, cursor.y, 2);
            const halfAcrossX = snapped.x % gridSize === halfGridSize;
            const halfAcrossY = snapped.y % gridSize === halfGridSize;

            const token = this.token;
            const template = this.template;
            // Enforce PF2e rules of an effect area originating from a corner or edge
            const [snappedX, snappedY] = ((): [number, number] => {
                if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
                    return [snapped.x, snapped.y];
                }
                const minimum = { x: token.x, y: token.y };
                const maximum = { x: token.x + token.width, y: token.y + token.height };
                const clampX = (x: number) => clampNumber(x, minimum.x, maximum.x);
                const clampY = (y: number) => clampNumber(y, minimum.y, maximum.y);
                snapped.x = clampNumber(snapped.x, minimum.x, maximum.x);
                snapped.y = clampNumber(snapped.y, minimum.y, maximum.y);
                if (snapped.x === token.center.x && snapped.y === token.center.y) {
                    snapped.x = Math.abs(cursor.x - minimum.x) < Math.abs(cursor.x - maximum.x) ? minimum.x : maximum.x;
                    snapped.y = Math.abs(cursor.y - minimum.y) < Math.abs(cursor.y - maximum.y) ? minimum.y : maximum.y;
                }

                if (halfAcrossX && halfAcrossY) {
                    // Hovering over the center of a square, so snap to an edge or corner
                    const xIsCloser = Math.abs(cursor.x - snapped.x) < Math.abs(cursor.y - snapped.y);
                    return xIsCloser
                        ? [snapped.x, clampY(Math.abs(snapped.y - halfGridSize))]
                        : [clampX(Math.abs(snapped.x - halfGridSize)), snapped.y];
                }
                return [snapped.x, snapped.y];
            })();

            const angle = calcAngle(token.center, cursor);
            // const tokenCorner: Record<string, Point> = {
            //     topLeft: token,
            //     topRight: { x: token.x + token.width, y: token.y },
            //     bottomRight: { x: token.x + token.width, y: token.y + token.height },
            //     bottomLeft: { x: token.x, y: token.y + token.height },
            // };
            const snappedAngle = Math.ceil((angle + 1) / 45) * 45;
            console.log(snappedAngle);
            // Set angle according to position relative to token

            template.data.x = snappedX;
            template.data.y = snappedY;
            template.data.direction = snappedAngle;
            template.clear();
            template.draw();
        };
    }
}
