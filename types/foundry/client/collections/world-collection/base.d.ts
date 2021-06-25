/**
 * A singleton Collection of world-level Document objects within the Foundry Virtual Tabletop.
 * Each primary Document type has an associated subclass of WorldCollection which contains them.
 * @param data An array of data objects from which to create Document instances
 */
declare abstract class WorldCollection<
    TDocument extends foundry.abstract.Document,
> extends DocumentCollection<TDocument> {
    /** @override */
    constructor(data?: TDocument['data']['_source'][]);

    /** The source data is, itself, a mapping of IDs to data objects */
    protected readonly _source: TDocument['data']['_source'];

    /** An Array of application references which will be automatically updated when the collection content changes */
    apps: Application[];

    /**
     * Initialize the WorldCollection object by constructing its contained Document instances
     * @param data
     */
    protected _initialize(data: TDocument['data']['_source'][]): void;

    /* -------------------------------------------- */
    /*  Collection Properties                       */
    /* -------------------------------------------- */

    /** @override */
    get documentName(): string | null;

    /** The base Document type which is contained within this WorldCollection */
    static documentName: string | null;

    /**
     * Return a reference to the SidebarDirectory application for this WorldCollection, or null if it has not yet been
     * created.
     */
    get directory(): SidebarDirectory | null;

    /** Return a reference to the singleton instance of this WorldCollection, or null if it has not yet been created. */
    static get instance(): WorldCollection<ClientDocument>;

    /* -------------------------------------------- */
    /*  Collection Methods                          */
    /* -------------------------------------------- */

    /** @override */
    set(id: string, document: TDocument): this;

    /** @override */
    delete(id: string): boolean;

    /**
     * Import a Document from a Compendium collection, adding it to the current World.
     * @param pack         The CompendiumCollection instance from which to import
     * @param id           The ID of the compendium entry to import
     * @param [updateData] Optional additional data used to modify the imported Document before it is created
     * @param [options]    Optional arguments passed to the Document.create method
     * @return The imported Document instance
     */
    importFromCompendium(
        pack: CompendiumCollection,
        id: string,
        updateData?: DocumentUpdateData<TDocument>,
        options?: DocumentModificationContext,
    ): Promise<TDocument>;

    /**
     * Apply data transformations when importing a Document from a Compendium pack
     * @param document The source Document, or a plain data object
     * @return The processed data ready for world Document creation
     */
    fromCompendium(document: TDocument | TDocument['data']['_source']): TDocument['data']['_source'];
}
