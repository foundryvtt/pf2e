import { DrawingConstructor } from "./constructors";

declare global {
    /**
     * The client-side Drawing embedded document which extends the common BaseDrawing abstraction.
     * Each Drawing document contains DrawingData which defines its data schema.
     * @see {@link data.DrawingData}              The Drawing data schema
     * @see {@link documents.Scene}               The Scene document type which contains Drawing embedded documents
     * @see {@link applications.DrawingConfig}    The Drawing configuration application
     *
     */
    class DrawingDocument extends DrawingConstructor {
        /** A reference to the User who created the Drawing document. */
        get author(): User | undefined;

        /** A flag for whether the current User has full ownership over the Drawing document. */
        override get isOwner(): boolean;
    }

    interface DrawingDocument {
        readonly parent: Scene | null;

        readonly _object: Drawing;
    }
}
