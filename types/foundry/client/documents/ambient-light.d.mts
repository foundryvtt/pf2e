import AmbientLight from "@client/canvas/placeables/light.mjs";
import { BaseAmbientLight } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

declare const CanvasBaseAmbientLight: new <TParent extends Scene | null>(
    ...args: any
) => BaseAmbientLight<TParent> & CanvasDocument<TParent>;

interface CanvasBaseAmbientLight<TParent extends Scene | null>
    extends InstanceType<typeof CanvasBaseAmbientLight<TParent>> {}

export default class AmbientLightDocument<TParent extends Scene | null> extends CanvasBaseAmbientLight<TParent> {
    /** Is this ambient light source global in nature? */
    get isGlobal(): boolean;
}

export default interface AmbientLightDocument<TParent extends Scene | null> extends CanvasBaseAmbientLight<TParent> {
    get object(): AmbientLight<this> | null;
}

export {};
