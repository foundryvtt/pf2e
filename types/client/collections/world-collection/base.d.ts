/**
 * An iterable container of Entity objects within the Foundry Virtual Tabletop framework.
 * Each Entity type has its own subclass of EntityCollection, which defines the abstract interface.
 */
declare abstract class WorldCollection<
    D extends foundry.abstract.Document = foundry.abstract.Document
> extends DocumentCollection<D> {
    /**
     * The source data is, itself, a mapping of IDs to data objects
     */
    protected _source: D['data'];

    /**
     * An Array of application references which will be automatically updated when the collection content changes
     */
    apps: Application[];

    /**
     * @param data An Array of Entity data from which to create instances
     * @override
     */
    constructor(data?: D['data']);

    /**
     * Initialize the Map object and all its contained entities
     * @param data
     */
    protected _initialize(data: D['data']['_source'][]): void;

    /**
     * Render any Applications associated with this EntityCollection
     * @return A reference to the rendered EntityCollection
     */
    render(...args: Parameters<Application['render']>): this;

    /* -------------------------------------------- */
    /*  EntityCollection Properties                 */
    /* -------------------------------------------- */

    /**
     * The EntityCollection name
     */
    get name(): string;

    /* -------------------------------------------- */

    /**
     * Return a reference to the SidebarDirectory application for this EntityCollection, or null if it has not yet been created.
     */
    get directory(): SidebarDirectory | null;

    /**
     * Return a reference to the singleton instance of this EntityCollection, or null if it has not yet been created.
     */
    static get instance(): WorldCollection<foundry.abstract.Document> | null;

    /* -------------------------------------------- */

    /**
     * Return a reference to the Entity subclass which should be used when creating elements of this EntityCollection.
     * This should always be an explicit reference to the class which is used in this game to represent the entity,
     * and not the base implementation of that entity type.
     */
    get object(): {
        new (...args: any[]): D;
        create(data: Partial<D['data']>, options?: {}): Promise<D>;
        entity: string;
    };

    /* -------------------------------------------- */
    /*  EntityCollection Management Methods         */
    /* -------------------------------------------- */

    /**
     * Add a new Entity to the EntityCollection, asserting that they are of the correct type.
     * @param entity The entity instance to add to the collection
     */
    insert(entity: D): void;

    /**
     * Remove an Entity from the EntityCollection by its ID.
     * @param id {string}   The entity ID which should be removed
     */
    remove(id: string): void;

    /**
     * Import an Entity from a compendium collection, adding it to the current World.
     * @param collection     The name of the pack from which to import
     * @param entryId        The ID of the compendium entry to import
     * @param [updateData]   Optional additional data used to modify the imported Entity before it is created
     * @param [options]      Optional arguments passed to the Entity.create method
     * @return A Promise containing the imported Entity
     */
    importFromCollection(
        collection: string,
        entryId: string,
        updateData?: DocumentUpdateData | {},
        options?: foundry.abstract.DocumentModificationContext,
    ): Promise<D | null>;

    /**
     * Apply data transformations when importing an Entity from a Compendium pack
     * @param  The original Compendium entry data
     * @return The processed data ready for Entity creation
     */
    fromCompendium(data: D['data']): D['data'];

    /**
     * Update all objects in this EntityCollection with a provided transformation.
     * Conditionally filter to only apply to Entities which match a certain condition.
     * @param transformation An object of data or function to apply to all matched objects
     * @param condition      A function which tests whether to target each object
     * @param [options]      Additional options passed to Entity.update
     * @return An array of updated data once the operation is complete
     */
    updateAll(
        transformation: (updateData: DocumentUpdateData) => DeepPartial<D['data']> | DocumentUpdateData,
        condition?: (entity: D) => boolean,
        options?: foundry.abstract.DocumentModificationContext,
    ): Promise<(D['data'] | null)[]>;
}
