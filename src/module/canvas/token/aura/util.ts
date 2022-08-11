import { EffectAreaSquare } from "@module/canvas/effect-area-square";
import { measureDistanceRect } from "@module/canvas/helpers";
import { TokenAuraData } from "@scene/token-document/aura/types";

export function getAreaSquares(aura: TokenAuraData) {
    if (!canvas.dimensions) return [];
    const squareWidth = canvas.dimensions.size;
    const rowCount = Math.ceil(aura.bounds.width / squareWidth);
    const emptyVector = Array<null>(rowCount - 1).fill(null);

    const genColumn = (square: EffectAreaSquare): EffectAreaSquare[] => {
        return emptyVector.reduce(
            (colSquares) => {
                const squareAbove = colSquares.at(-1)!;
                const squareBelow = new EffectAreaSquare(
                    square.x,
                    squareAbove.y + squareWidth,
                    squareWidth,
                    squareWidth
                );
                colSquares.push(squareBelow);
                return colSquares;
            },
            [square]
        );
    };

    const topLeftSquare = new EffectAreaSquare(aura.bounds.x, aura.bounds.y, squareWidth, squareWidth);
    const collisionType =
        aura.traits.has("visual") && !aura.traits.has("auditory")
            ? "sight"
            : aura.traits.has("auditory") && !aura.traits.has("visual")
            ? "sound"
            : "move";

    return emptyVector
        .reduce(
            (squares: EffectAreaSquare[][]) => {
                const lastSquare = squares.at(-1)!.at(-1)!;
                const column = genColumn(
                    new EffectAreaSquare(lastSquare.x + squareWidth, topLeftSquare.y, squareWidth, squareWidth)
                );
                squares.push(column);
                return squares;
            },
            [genColumn(topLeftSquare)]
        )
        .flat()
        .filter((s) => measureDistanceRect(aura.token.bounds, s) <= aura.radius)
        .map((square) => {
            const ray = new Ray(aura.token.center, square.center);
            square.active = !canvas.walls.checkCollision(ray, { type: collisionType, mode: "any" });
            return square;
        });
}
