import Tile from "../canvas/placeables/tile.mjs";
import { BaseTile } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

declare const CanvasBaseTile: new <TParent extends Scene | null>(
    ...args: any
) => InstanceType<typeof BaseTile<TParent>> & InstanceType<typeof CanvasDocument<TParent>>;

interface CanvasBaseTile<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseTile<TParent>> {}

export default class TileDocument<TParent extends Scene | null> extends CanvasBaseTile<TParent> {
    override prepareDerivedData(): void;
}

export default interface TileDocument<TParent extends Scene | null> extends CanvasBaseTile<TParent> {
    readonly _object: Tile<this> | null;
}

export {};
