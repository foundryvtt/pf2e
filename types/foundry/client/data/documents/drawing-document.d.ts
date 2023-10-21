import type { CanvasBaseDrawing } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Drawing document which extends the common BaseDrawing model.
     *
     * @see {@link Scene}               The Scene document type which contains Drawing embedded documents
     * @see {@link DrawingConfig}       The Drawing configuration application
     */
    class DrawingDocument<TParent extends Scene | null> extends CanvasBaseDrawing<TParent> {
        /** Define an elevation property on the Drawing Document which in the future will become a part of its data schema. */
        accessor elevation: number;

        /** A flag for whether the current User has full ownership over the Drawing document. */
        override get isOwner(): boolean;
    }

    interface DrawingDocument<TParent extends Scene | null> extends CanvasBaseDrawing<TParent> {
        readonly _object: Drawing<this> | null;
    }
}
