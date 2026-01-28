import type { PointEffectSource } from "@client/canvas/sources/point-effect-source.d.mts";
import { EffectAreaSquare } from "@module/canvas/effect-area-square.ts";
import { measureDistanceCuboid } from "@module/canvas/helpers.ts";
import { TokenDocumentPF2e } from "@scene";
import type { TokenPF2e } from "../index.ts";

export function getAreaSquares(data: GetAreaSquaresParams): EffectAreaSquare[] {
    if (!canvas.ready) return [];
    const squareWidth = canvas.dimensions.size;
    const rowCount = Math.ceil(data.bounds.width / squareWidth);
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
            radius: data.radiusPixels,
        }),
    );

    const squares = Array.from({ length: rowCount * rowCount }, (_, i) => {
        const dx = Math.floor(i / rowCount);
        const dy = i % rowCount;
        return new EffectAreaSquare(
            data.bounds.x + squareWidth * dx,
            data.bounds.y + squareWidth * dy,
            squareWidth,
            squareWidth,
        );
    });

    return squares
        .filter((s) => measureDistanceCuboid(tokenBounds, s) <= data.radius)
        .map((square) => {
            square.active = tokenCenterPolygons.some((c) => c.contains(square.center.x, square.center.y));
            return square;
        });
}

interface GetAreaSquaresParams {
    bounds: PIXI.Rectangle;
    radius: number;
    radiusPixels: number;
    token: TokenPF2e | TokenDocumentPF2e;
    traits?: string[];
}
