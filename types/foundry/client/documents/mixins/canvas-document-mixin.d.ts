export {};

declare global {
    /**
     * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
     * represented upon the game Canvas.
     * @mixin
     */
    function CanvasDocumentMixin<TDocument extends typeof foundry.abstract.Document, TLayer extends PlaceablesLayer>(
        Base: TDocument
    ): CanvasDocumentMixin<TDocument, TLayer>;

    type CanvasDocumentMixin<
        TDocument extends typeof foundry.abstract.Document,
        TLayer extends PlaceablesLayer
    > = TDocument & {
        new (...args: any[]): CanvasDocument<InstanceType<TDocument>, TLayer> & InstanceType<TDocument>;
    };

    class CanvasDocument<
        TDocument extends foundry.abstract.Document = foundry.abstract.Document,
        TLayer extends PlaceablesLayer = PlaceablesLayer<any>
    > extends ClientDocument<TDocument> {
        constructor(data: PreCreate<TDocument["_source"]>, context?: DocumentModificationContext);

        /** A reference to the PlaceableObject instance which represents this Embedded Document. */
        protected _object: TLayer["placeables"][number] | null;

        /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
        get object(): TLayer["placeables"][number];

        /** A reference to the CanvasLayer which contains Document objects of this type. */
        get layer(): TLayer;

        /** An indicator for whether this document is currently rendered on the game canvas. */
        get rendered(): boolean;

        protected override _onCreate(
            data: this["_source"],
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        protected override _onDelete(options: DocumentModificationContext, userId: string): void;
    }

    interface CanvasDocument<
        TDocument extends foundry.abstract.Document = foundry.abstract.Document,
        TLayer extends PlaceablesLayer = PlaceablesLayer<any>
    > extends ClientDocument<TDocument> {
        x: number;
        y: number;
        hidden: boolean;
    }
}
