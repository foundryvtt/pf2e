/**
 * A Collection of Document objects within the Foundry Virtual Tabletop framework.
 * @param data An array of data objects from which to create document instances
 */
declare abstract class DocumentCollection<TDocument extends foundry.abstract.Document> extends Collection<TDocument> {
    constructor();

    /** An Array of application references which will be automatically updated when the collection content changes */
    apps: Application[];

    /* -------------------------------------------- */
    /*  Collection Properties                       */
    /* -------------------------------------------- */

    /** The Collection class name */
    get name(): string;

    /** A reference to the Document class definition which is contained within this DocumentCollection. */
    get documentClass(): DocumentConstructorOf<TDocument>;

    /** A reference to the named Document class which is contained within this DocumentCollection. */
    abstract get documentName(): string | null;

    /* -------------------------------------------- */
    /*  Collection Methods                          */
    /* -------------------------------------------- */

    override set(id: string, document: TDocument): this;

    /** Render any Applications associated with this DocumentCollection. */
    render(force: boolean, options?: RenderOptions): void;

    /* -------------------------------------------- */
    /*  Database Operations                         */
    /* -------------------------------------------- */

    /**
     * Update all objects in this DocumentCollection with a provided transformation.
     * Conditionally filter to only apply to Entities which match a certain condition.
     * @param transformation An object of data or function to apply to all matched objects
     * @param condition      A function which tests whether to target each object
     * @param [options]      Additional options passed to Entity.update
     * @return An array of updated data once the operation is complete
     */
    updateAll(
        transformation: DocumentUpdateData<TDocument> | ((document: TDocument) => DocumentUpdateData<TDocument>),
        condition?: ((document: TDocument) => boolean) | null,
        options?: DocumentModificationContext<null>
    ): Promise<TDocument[]>;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are created.
     * @param result  An Array of created data objects
     * @param options Options which modified the creation operation
     * @param userId  The ID of the User who triggered the operation
     */
    protected _preCreateDocuments(
        result: TDocument["_source"][],
        options: DocumentModificationContext<null>,
        userId: string
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are created.
     * @param documents An Array of created Documents
     * @param result    An Array of created data objects
     * @param options   Options which modified the creation operation
     * @param userId    The ID of the User who triggered the operation
     */
    protected _onCreateDocuments(
        documents: TDocument[],
        result: TDocument["_source"][],
        options: DocumentModificationContext<null>,
        userId: string
    ): void;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are updated.
     * @param result  An Array of incremental data objects
     * @param options Options which modified the update operation
     * @param userId  The ID of the User who triggered the operation
     */
    protected _preUpdateDocuments(
        result: TDocument["_source"][],
        options: DocumentModificationContext<null>,
        userId: string
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are updated.
     * @param documents An Array of updated Documents
     * @param result    An Array of incremental data objects
     * @param options   Options which modified the update operation
     * @param userId    The ID of the User who triggered the operation
     */
    protected _onUpdateDocuments(
        documents: TDocument[],
        result: TDocument["_source"][],
        options: DocumentModificationContext<null>,
        userId: string
    ): void;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are deleted.
     * @param result  An Array of document IDs being deleted
     * @param options Options which modified the deletion operation
     * @param userId  The ID of the User who triggered the operation
     */
    protected _preDeleteDocuments(
        result: TDocument["_source"][],
        options: DocumentModificationContext<null>,
        userId: string
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are deleted.
     * @param documents An Array of deleted Documents
     * @param result    An Array of document IDs being deleted
     * @param options   Options which modified the deletion operation
     * @param userId    The ID of the User who triggered the operation
     */
    protected _onDeleteDocuments(
        documents: TDocument[],
        result: string[],
        options: DocumentModificationContext<null>,
        userId: string
    ): void;
}
