import type { PointEffectSource } from "@client/canvas/sources/point-effect-source.d.mts";
import { EffectAreaSquare } from "@module/canvas/effect-area-square.ts";
import { measureDistanceCuboid } from "@module/canvas/helpers.ts";
import { TokenDocumentPF2e } from "@scene";
import type { TokenPF2e } from "../index.ts";

export function getAreaSquares(data: GetAreaSquaresParams): EffectAreaSquare[] {
    if (!canvas.ready) return [];
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

    const pointSource = (() => {
        const sources = foundry.canvas.sources;
        const PointSource: ConstructorOf<PointEffectSource> = {
            sight: sources.PointVisionSource,
            sound: sources.PointSoundSource,
            move: sources.PointMovementSource,
        }[collisionType];
        const tokenObject = data.token instanceof TokenDocumentPF2e ? data.token.object : data.token;
        return new PointSource({ object: tokenObject });
    })();
    const tokenCenterPolygons = tokenCenters.map((c) =>
        CONFIG.Canvas.polygonBackends[collisionType].create(c, {
            type: collisionType,
            source: pointSource,
            boundaryShapes: [data.bounds],
        }),
    );

    return emptyVector
        .reduce(
            (squares: EffectAreaSquare[][]) => {
                const lastSquare = squares.at(-1)?.at(-1) ?? { x: NaN, y: NaN };
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
            square.active = tokenCenterPolygons.some((c) => c.contains(square.center.x, square.center.y));
            return square;
        });
}

interface GetAreaSquaresParams {
    bounds: PIXI.Rectangle;
    radius: number;
    token: TokenPF2e | TokenDocumentPF2e;
    traits?: string[];
}
