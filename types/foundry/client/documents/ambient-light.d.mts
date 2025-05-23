import AmbientLight from "@client/canvas/placeables/light.mjs";
import { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import { BaseAmbientLight } from "./_module.mjs";
import { CanvasDocument, CanvasDocumentStatic } from "./abstract/canvas-document.mjs";
import Scene from "./scene.mjs";

interface CanvasBaseAmbientLightStatic extends Omit<typeof BaseAmbientLight, "new">, CanvasDocumentStatic {}

declare const CanvasBaseAmbientLight: {
    new <TParent extends Scene | null>(...args: any): BaseAmbientLight<TParent> & CanvasDocument<TParent>;
} & CanvasBaseAmbientLightStatic;

interface CanvasBaseAmbientLight<TParent extends Scene | null>
    extends InstanceType<typeof CanvasBaseAmbientLight<TParent>> {}

export default class AmbientLightDocument<TParent extends Scene | null> extends CanvasBaseAmbientLight<TParent> {
    /* -------------------------------------------- */
    /*  Model Properties                            */
    /* -------------------------------------------- */

    /** Is this ambient light source global in nature? */
    get isGlobal(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;
}

export default interface AmbientLightDocument<TParent extends Scene | null> extends CanvasBaseAmbientLight<TParent> {
    get object(): AmbientLight<this> | null;
}

export {};
