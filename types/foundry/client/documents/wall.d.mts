import Wall from "../canvas/placeables/wall.mjs";
import { BaseWall } from "./_module.mjs";
import { CanvasDocument, CanvasDocumentStatic } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

interface CanvasBaseWallStatic extends Omit<typeof BaseWall, "new">, CanvasDocumentStatic {}

declare const CanvasBaseWall: {
    new <TParent extends Scene | null>(...args: any): BaseWall<TParent> & CanvasDocument<TParent>;
} & CanvasBaseWallStatic;

interface CanvasBaseWall<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseWall<TParent>> {}

export default class WallDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseWall<TParent> {}

export default interface WallDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseWall<TParent> {
    get object(): Wall<this> | null;
}

export {};
