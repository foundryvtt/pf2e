/**
 * A Collection of Document objects within the Foundry Virtual Tabletop framework.
 * @param data An array of data objects from which to create document instances
 */
declare abstract class DocumentCollection<TDocument extends foundry.abstract.Document> extends Collection<TDocument> {
    /** @override */
    constructor();

    /** An Array of application references which will be automatically updated when the collection content changes */
    apps: Application[];

    /* -------------------------------------------- */
    /*  Collection Properties                       */
    /* -------------------------------------------- */

    /** The Collection class name */
    get name(): string;

    /** A reference to the named Document class which is contained within this DocumentCollection. */
    abstract get documentName(): string;

    /* -------------------------------------------- */
    /*  Collection Methods                          */
    /* -------------------------------------------- */

    /** @override */
    set(id: string, document: TDocument): this;

    /* -------------------------------------------- */

    /** Render any Applications associated with this DocumentCollection. */
    render(force: boolean, options?: RenderOptions): void;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are created.
     * @param result  An Array of created data objects
     * @param options Options which modified the creation operation
     * @param userId  The ID of the User who triggered the operation
     */
    _preCreateDocuments(
        result: TDocument['data']['_source'][],
        options: foundry.abstract.DocumentModificationContext,
        userId: string,
    ): void;

    /* -------------------------------------------- */

    /**
     * Follow-up actions taken after a set of Documents in this Collection are created.
     * @param documents An Array of created Documents
     * @param result    An Array of created data objects
     * @param options   Options which modified the creation operation
     * @param userId    The ID of the User who triggered the operation
     */
    _onCreateDocuments(
        documents: TDocument[],
        result: TDocument['data']['_source'][],
        options: foundry.abstract.DocumentModificationContext,
        userId: string,
    ): void;

    /* -------------------------------------------- */

    /**
     * Preliminary actions taken before a set of Documents in this Collection are updated.
     * @param result  An Array of incremental data objects
     * @param options Options which modified the update operation
     * @param userId  The ID of the User who triggered the operation
     */
    _preUpdateDocuments(
        result: TDocument['data']['_source'][],
        options: foundry.abstract.DocumentModificationContext,
        userId: string,
    ): void;

    /* -------------------------------------------- */

    /**
     * Follow-up actions taken after a set of Documents in this Collection are updated.
     * @param documents An Array of updated Documents
     * @param result    An Array of incremental data objects
     * @param options   Options which modified the update operation
     * @param userId    The ID of the User who triggered the operation
     */
    _onUpdateDocuments(
        documents: TDocument[],
        result: TDocument['data']['_source'][],
        options: foundry.abstract.DocumentModificationContext,
        userId: string,
    ): void;

    /* -------------------------------------------- */

    /**
     * Preliminary actions taken before a set of Documents in this Collection are deleted.
     * @param result  An Array of document IDs being deleted
     * @param options Options which modified the deletion operation
     * @param userId  The ID of the User who triggered the operation
     */
    _preDeleteDocuments(
        result: TDocument['data']['_source'][],
        options: foundry.abstract.DocumentModificationContext,
        userId: string,
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are deleted.
     * @param documents An Array of deleted Documents
     * @param result    An Array of document IDs being deleted
     * @param options   Options which modified the deletion operation
     * @param userId    The ID of the User who triggered the operation
     */
    _onDeleteDocuments(
        documents: TDocument[],
        result: TDocument['data']['_source'][],
        options: foundry.abstract.DocumentModificationContext,
        userId: string,
    ): void;
}
