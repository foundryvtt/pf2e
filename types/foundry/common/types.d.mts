import "../client/pixi";

declare global {
    /* ----------------------------------------- */
    /*  Reusable Type Definitions                */
    /* ----------------------------------------- */

    /** A single point, expressed as an object {x, y} */
    export type Point = PIXI.Point | { x: number; y: number };

    /** A single point, expressed as an array [x,y] */
    export type PointArray = [number, number];

    /** A standard rectangle interface. */
    export type Rectangle = PIXI.Rectangle | { x: number; y: number; width: number; height: number };
}
