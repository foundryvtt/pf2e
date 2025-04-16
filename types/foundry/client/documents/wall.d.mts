import Wall from "../canvas/placeables/wall.mjs";
import { BaseWall } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

declare const CanvasBaseWall: new <TParent extends Scene | null>(
    ...args: any
) => InstanceType<typeof BaseWall<TParent>> & InstanceType<typeof CanvasDocument<TParent>>;

interface CanvasBaseWall<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseWall<TParent>> {}

export default class WallDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseWall<TParent> {}

export default interface WallDocument<TParent extends Scene | null = Scene | null> extends CanvasBaseWall<TParent> {
    get object(): Wall<this> | null;
}

export {};
