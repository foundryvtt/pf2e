import { EffectAreaSquare } from "@module/canvas/effect-area-square.ts";
import { measureDistanceCuboid } from "@module/canvas/helpers.ts";
import { TokenDocumentPF2e } from "@scene";
import { TokenPF2e } from "../index.ts";

export function getAreaSquares(data: GetAreaSquaresParams): EffectAreaSquare[] {
    if (!canvas.dimensions) return [];
    const squareWidth = canvas.dimensions.size;
    const rowCount = Math.ceil(data.bounds.width / squareWidth);
    const emptyVector = Array<null>(rowCount - 1).fill(null);

    const genColumn = (square: EffectAreaSquare): EffectAreaSquare[] => {
        return emptyVector.reduce(
            (colSquares) => {
                const squareAbove = colSquares.at(-1)!;
                const squareBelow = new EffectAreaSquare(
                    square.x,
                    squareAbove.y + squareWidth,
                    squareWidth,
                    squareWidth,
                );
                colSquares.push(squareBelow);
                return colSquares;
            },
            [square],
        );
    };

    const topLeftSquare = new EffectAreaSquare(data.bounds.x, data.bounds.y, squareWidth, squareWidth);
    const collisionType =
        data.traits?.includes("visual") && !data.traits.includes("auditory")
            ? "sight"
            : data.traits?.includes("auditory") && !data.traits.includes("visual")
            ? "sound"
            : "move";

    const tokenBounds = data.token.mechanicalBounds;
    const tokenCenter = data.token.center;
    const tokenCenters = [
        tokenCenter,
        ...[
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: -1, y: 0 },
        ].map((c) => ({
            x: tokenCenter.x + c.x * Math.round(tokenBounds.width / 8),
            y: tokenCenter.y + c.y * Math.round(tokenBounds.height / 8),
        })),
    ];

    return emptyVector
        .reduce(
            (squares: EffectAreaSquare[][]) => {
                const lastSquare = squares.at(-1)!.at(-1)!;
                const column = genColumn(
                    new EffectAreaSquare(lastSquare.x + squareWidth, topLeftSquare.y, squareWidth, squareWidth),
                );
                squares.push(column);
                return squares;
            },
            [genColumn(topLeftSquare)],
        )
        .flat()
        .filter((s) => measureDistanceCuboid(tokenBounds, s) <= data.radius)
        .map((square) => {
            square.active = tokenCenters.some(
                (c) =>
                    !CONFIG.Canvas.polygonBackends[collisionType].testCollision(c, square.center, {
                        type: collisionType,
                        mode: "any",
                    }),
            );
            return square;
        });
}

interface GetAreaSquaresParams {
    bounds: PIXI.Rectangle;
    radius: number;
    token: TokenPF2e | TokenDocumentPF2e;
    traits?: string[];
}
