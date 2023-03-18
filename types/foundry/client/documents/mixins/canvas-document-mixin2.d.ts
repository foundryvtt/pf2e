/**
 * A specialized sub-class of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category - Mixins
 */
declare class CanvasDocument2<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TParent extends ClientDocument2<any> | null = ClientDocument2<any> | null
> extends ClientDocument2<TParent> {
    /** A reference to the PlaceableObject instance which represents this Embedded Document. */
    _object: PlaceableObject<this> | null;

    /** Has this object been deliberately destroyed as part of the deletion workflow? */
    protected _destroyed: boolean;

    constructor(data: object, context: DocumentConstructionContext<TParent>);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A lazily constructed PlaceableObject instance which can represent this Document on the game canvas. */
    get object(): this["_object"];

    /** A reference to the CanvasLayer which contains Document objects of this type. */
    get layer(): NonNullable<this["object"]>["layer"] | null;

    /** An indicator for whether this document is currently rendered on the game canvas. */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * @see abstract.Document#_onCreate
     */
    protected _onCreate(data: this["_source"], options: DocumentModificationContext<this>, userId: string): void;

    /**
     * @see abstract.Document#_onUpdate
     */
    protected _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<this>,
        userId: string
    ): void;

    /**
     * @see abstract.Document#_onDelete
     */
    protected _onDelete(options: DocumentModificationContext<this>, userId: string): void;
}

declare interface CanvasDocument2<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TParent extends ClientDocument2<any> | null = ClientDocument2<any> | null
> extends ClientDocument2<TParent> {
    // System note: in most but not all canvas documents
    hidden?: boolean;
}
