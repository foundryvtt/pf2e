export {};

type _CanvasDocument = CanvasDocument<foundry.abstract.Document, PlaceablesLayer<PlaceableObject<_CanvasDocument>>>;

declare global {
    /**
     * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
     * represented upon the game Canvas.
     * @mixin
     */
    function CanvasDocumentMixin<
        TDocument extends typeof foundry.abstract.Document,
        TLayer extends PlaceablesLayer | null,
    >(Base: TDocument): CanvasDocumentMixin<TDocument, TLayer>;

    type CanvasDocumentMixin<
        TDocument extends typeof foundry.abstract.Document,
        TLayer extends PlaceablesLayer | null,
    > = TDocument & {
        new (...args: any[]): CanvasDocument<InstanceType<TDocument>, TLayer> & InstanceType<TDocument>;
    };

    class CanvasDocument<
        TDocument extends foundry.abstract.Document = foundry.abstract.Document,
        TLayer extends PlaceablesLayer<PlaceableObject<CanvasDocument>> | null = PlaceablesLayer<
            PlaceableObject<_CanvasDocument>
        > | null,
    > extends ClientDocument<TDocument> {
        /** @override */
        constructor(data: PreCreate<TDocument['data']['_source']>, context?: DocumentModificationContext);

        /** A reference to the PlaceableObject instance which represents this Embedded Document. */
        _object: TLayer extends PlaceablesLayer ? TLayer['placeables'][number] | null : null;

        /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
        get object(): this['_object'];

        /** A reference to the CanvasLayer which contains Document objects of this type. */
        get layer(): TLayer;

        /** An indicator for whether this document is currently rendered on the game canvas. */
        get rendered(): boolean;

        protected override _onCreate(
            data: this['data']['_source'],
            options: DocumentModificationContext,
            userId: string,
        ): void;

        protected override _onUpdate(
            changed: DeepPartial<this['data']['_source']>,
            options: DocumentModificationContext,
            userId: string,
        ): void;

        protected override _onDelete(options: DocumentModificationContext, userId: string): void;
    }
}
