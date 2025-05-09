import AmbientSound from "@client/canvas/placeables/sound.mjs";
import { BaseAmbientSound } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

declare const CanvasBaseAmbientSound: new <TParent extends Scene | null>(
    ...args: any
) => BaseAmbientSound<TParent> & CanvasDocument<TParent>;

interface CanvasBaseAmbientSound<TParent extends Scene | null>
    extends InstanceType<typeof CanvasBaseAmbientSound<TParent>> {}

export default class AmbientSoundDocument<TParent extends Scene | null> extends CanvasBaseAmbientSound<TParent> {}

export default interface AmbientSoundDocument<TParent extends Scene | null> extends CanvasBaseAmbientSound<TParent> {
    readonly _object: AmbientSound<this> | null;
}

export {};
