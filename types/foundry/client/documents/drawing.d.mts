import Drawing from "../canvas/placeables/drawing.mjs";
import { BaseDrawing } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";
import ClientDocumentMixin from "./abstract/client-document.mjs";
import Scene from "./scene.mjs";

declare const CanvasBaseDrawing: new <TParent extends Scene | null>(
    ...args: any
) => InstanceType<typeof BaseDrawing<TParent>> & InstanceType<typeof CanvasDocument<TParent>>;

interface CanvasBaseDrawing<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseDrawing<TParent>> {}

/**
 * The client-side Drawing document which extends the common BaseDrawing model.
 *
 * @see {@link Scene}               The Scene document type which contains Drawing embedded documents
 * @see {@link DrawingConfig}       The Drawing configuration application
 */
export default class DrawingDocument extends ClientDocumentMixin(BaseDrawing) {
    /** Define an elevation property on the Drawing Document which in the future will become a part of its data schema. */
    accessor elevation: number;

    /** A flag for whether the current User has full ownership over the Drawing document. */
    override get isOwner(): boolean;
}

export default interface DrawingDocument {
    readonly _object: Drawing<this> | null;
}

export {};
