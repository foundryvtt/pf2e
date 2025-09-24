import { TokenShape } from "@client/canvas/placeables/token.mjs";
import { DataModelConstructionContext } from "./abstract/_types.mjs";
import Document from "./abstract/document.mjs";
import * as CONST from "./constants.mjs";
import { GridOffset2D } from "./grid/_types.mjs";
import Color from "./utils/color.mjs";

/* ----------------------------------------- */
/*  Data Model                               */
/* ----------------------------------------- */

export interface DocumentConstructionContext<TParent extends Document | null>
    extends DataModelConstructionContext<TParent> {
    /** The compendium collection ID which contains this Document, if any */
    pack?: string | null;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | symbol | null | undefined;

/* ----------------------------------------- */
/*  Reusable Type Definitions                */
/* ----------------------------------------- */

/**
 * Make all properties in T recursively readonly.
 */
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends undefined | null | boolean | number | string | symbol | bigint | Function
        ? T[K]
        : T[K] extends Array<infer V>
          ? ReadonlyArray<DeepReadonly<V>>
          : T[K] extends Map<infer K, infer V>
            ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
            : T[K] extends Set<infer V>
              ? ReadonlySet<DeepReadonly<V>>
              : DeepReadonly<T[K]>;
};

/**
 * A 2D point, expressed as an array [x, y].
 */
export interface Point {
    /** The x-coordinate in pixels */
    x: number;
    /** The y-coordinate of the top-left corner */
    y: number;
}

/**
 * A single point, expressed as an array [x,y]
 */
export type PointArray = [x: number, y: number];

/**
 * A 3D point, expessed as {x, y, elevation}.
 */
export interface ElevatedPoint extends Point {
    /** The elevation in grid units */
    elevation: number;
}

/**
 * A standard rectangle interface.
 */
interface Rectangle {
    /** The x-coordinate of the top-left corner */
    x: number;
    /** The y-coordinate of the top-left corner */
    y: number;
    /** The width */
    width: number;
    /** The height */
    height: number;
}

type BuiltinTypes = NumberConstructor | StringConstructor | BooleanConstructor;

type ColorSource = number | [red: number, green: number, blue: number] | string | Color;

/* ----------------------------------------- */
/*  Socket Requests and Responses            */
/* ----------------------------------------- */

export type RequestData = object | object[] | string | string[];

export interface SocketRequest {
    /** The type of object being modified */
    type?: string;
    /** The server-side action being requested */
    action?: string;
    /** Data applied to the operation */
    data?: RequestData;
    query?: object;
    /** The type of parent document */
    parentType?: string;
    /** The ID of a parent document */
    parentId?: string;
    /** A Compendium pack name */
    pack?: string | null;
    /** Additional options applied to the request */
    options?: object;
}

export interface SocketResponse {
    /** The initial request */
    request: SocketRequest;
    /** An error, if one occurred */
    error?: Error;
    /** The status of the request */
    status?: string;
    /** The ID of the requesting User */
    userId?: string;
    /** Data returned as a result of the request */
    result: Record<string, unknown>[];
}

/* ----------------------------------------- */
/*  Token Typedefs                           */
/* ----------------------------------------- */

interface TokenPosition extends ElevatedPoint {
    /** The width in grid spaces (positive). */
    width: number;
    /** The height in grid spaces (positive). */
    height: number;
    /** The shape type (see {@link CONST.TOKEN_SHAPES}). */
    shape: TokenShape;
}

type TokenDimensions = Pick<TokenPosition, "width" | "height" | "shape">;

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
