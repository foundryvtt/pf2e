import Tile from "../canvas/placeables/tile.mjs";
import { BaseTile } from "./_module.mjs";
import { CanvasDocument, CanvasDocumentStatic } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

interface CanvasBaseTileStatic extends Omit<typeof BaseTile, "new">, CanvasDocumentStatic {}

declare const CanvasBaseTile: {
    new <TParent extends Scene | null>(...args: any): BaseTile<TParent> & CanvasDocument<TParent>;
} & CanvasBaseTileStatic;

interface CanvasBaseTile<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseTile<TParent>> {}

export default class TileDocument<TParent extends Scene | null> extends CanvasBaseTile<TParent> {
    override prepareDerivedData(): void;
}

export default interface TileDocument<TParent extends Scene | null> extends CanvasBaseTile<TParent> {
    readonly _object: Tile<this> | null;
}

export {};
