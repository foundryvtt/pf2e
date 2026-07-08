import { ElevatedPoint, Point } from "@common/_types.mjs";
import { TokenShapeType } from "@common/constants.mjs";
import { GridOffset2D } from "@common/grid/_types.mjs";

export interface LevelTexture {
    src: string;
    tint: string;
    alphaThreshold: number;
}

/* ----------------------------------------- */
/*  Token Typedefs                           */
/* ----------------------------------------- */

interface TokenPosition extends ElevatedPoint {
    /** The width in grid spaces (positive). */
    width: number;
    /** The height in grid spaces (positive). */
    height: number;
    /** The depth in grid spaces (nonnegative). */
    depth: number;
    /** The shape type (see {@link CONST.TOKEN_SHAPES}). */
    shape: TokenShapeType;
    /** The level ID. */
    level: string;
}

type TokenCoordinates = Pick<TokenPosition, "x" | "y" | "elevation" | "level">;

type TokenDimensions = Pick<TokenPosition, "width" | "height" | "depth" | "shape">;

interface TokenHexagonalOffsetsData {
    /** The occupied offsets in an even grid in the 0th row/column */
    even: GridOffset2D[];
    /** The occupied offsets in an odd grid in the 0th row/column */
    odd: GridOffset2D[];
    /** The anchor in normalized coordiantes */
    anchor: Point;
}

/**
 * The hexagonal shape of a Token.
 */
interface TokenHexagonalShapeData {
    /** The occupied offsets in even/odd rows/columns */
    offsets: { even: GridOffset2D[]; odd: GridOffset2D[] };
    /** The points in normalized coordinates */
    points: number[];
    /** The center of the shape in normalized coordiantes */
    center: Point;
    /** The snapping anchor in normalized coordiantes, i.e. the top-left grid hex center in the snapped position */
    anchor: Point;
}
