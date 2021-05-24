declare type CompendiumDocumentString = typeof CONST.COMPENDIUM_ENTITY_TYPES[number];
declare type CompendiumUUID = `${'Compendium' | CompendiumDocumentString}.${string}.${string}`;
// declare function fromUuid(uuid: CompendiumUUID): Promise<CompendiumDocument | null>;

// declare interface CompendiumMetadata<T extends foundry.abstract.Document = foundry.abstract.Document> {
//     absPath: string;
//     readonly entity: T extends Actor
//         ? 'Actor'
//         : T extends Item
//         ? 'Item'
//         : T extends JournalEntry
//         ? 'JournalEntry'
//         : T extends Macro
//         ? 'Macro'
//         : T extends Playlist
//         ? 'Playlist'
//         : T extends RollTable
//         ? 'RollTable'
//         : T extends Scene
//         ? 'Scene'
//         : CompendiumDocumentString;
//     label: string;
//     module: string;
//     name: string;
//     package: string;
//     path: string;
//     system: string;
// }

declare type CompendiumIndex = {
    _id: string;
    name: string;
    image: string;
}[];

declare type CompendiumDocument =
    | foundry.documents.BaseActor
    | foundry.documents.BaseItem
    | foundry.documents.BaseJournalEntry
    | foundry.documents.BaseMacro
    | foundry.documents.BasePlaylist
    | foundry.documents.BaseRollTable
    | foundry.documents.BaseScene;

/**
 * A singleton Collection of Compendium-level Document objects within the Foundry Virtual Tabletop.
 * Each Compendium pack has its own associated instance of the CompendiumCollection class which contains its contents.
 * @extends {DocumentCollection}
 * @abstract
 *
 * @param metadata The compendium metadata, an object provided by game.data
 */
declare class CompendiumCollection<
    TDocument extends CompendiumDocument = CompendiumDocument,
> extends DocumentCollection<TDocument> {
    /**
     * The compendium metadata which defines the compendium content and location
     */
    // @ts-ignore
    metadata: CompendiumMetadata<TDocument>;

    /**
     * Track whether the compendium pack is private
     */
    private: boolean;

    /**
     * The most recently retrieved index of the Compendium content
     * This index is not guaranteed to be current - call getIndex() to reload the index
     */
    index: CompendiumIndex;

    /**
     * Track whether the compendium pack is locked for editing
     */
    locked: boolean;

    // Internal flags
    searchString: string | null;
    protected _searchTime: number;

    // @ts-ignore
    constructor(metadata: CompendiumMetadata<TDocument>, options?: ApplicationOptions);

    static CONFIG_SETTING: 'compendiumConfiguration';

    /** @override */
    get title(): string;

    /**
     * The canonical Compendium name - comprised of the originating package and the pack name
     * @return The canonical collection name
     */
    get collection(): string;

    /**
     * The Entity type which is allowed to be stored in this collection
     */
    get documentName(): TDocument extends Actor
        ? 'Actor'
        : TDocument extends Item
        ? 'Item'
        : TDocument extends JournalEntry
        ? 'JournalEntry'
        : TDocument extends Macro
        ? 'Macro'
        : TDocument extends RollTable
        ? 'RollTable'
        : CompendiumDocumentString;

    /**
     * A reference to the Entity class object contained within this Compendium pack
     */
    get cls(): {
        new (...args: any[]): CompendiumDocument | CompendiumDocument[];
        create(
            data: Partial<TDocument['data']> | Partial<TDocument['data']>[],
            options?: DocumentModificationContext,
        ): Promise<CompendiumDocument | CompendiumDocument[]>;
    };

    /* ----------------------------------------- */
    /*  Methods
            /* ----------------------------------------- */

    /**
     * Create a new Compendium pack using provided
     * @param metadata The compendium metadata used to create the new pack
     */
    static create(metadata: CompendiumMetadata, options?: {}): Promise<CompendiumCollection>;

    /**
     * Assign configuration metadata settings to the compendium pack
     * @param settings The object of compendium settings to define
     * @return A Promise which resolves once the setting is updated
     */
    configure(settings?: { locked?: boolean; private?: boolean }): Promise<{ locked: boolean; private: boolean }>;

    /**
     * Duplicate a compendium pack to the current World
     * @param label
     */
    duplicate({ label }?: { label?: string }): Promise<CompendiumCollection>;

    /**
     * Get the Compendium index
     * Contains names, images and IDs of all data in the compendium
     *
     * @return A Promise containing an index of all compendium entries
     */
    getIndex(): Promise<CompendiumIndex>;

    /**
     * Get a single Document from this Compendium by ID.
     * The document may already be locally cached, otherwise it is retrieved from the server.
     * @param id The requested Document id
     * @returns The retrieved Document instance
     */
    getDocument(id: string): Promise<TDocument | null>;

    /**
     * Load multiple documents from the Compendium pack using a provided query object.
     * @param query A database query used to retrieve documents from the underlying database
     * @returns The retrieved Document instances
     */
    getDocuments<D extends TDocument = TDocument>(query?: Record<string, unknown>): Promise<D[]>;

    /**
     * Fully import the contents of a Compendium pack into a World folder.
     * @param An existing Folder _id to use.
     * @param [folderName] A new Folder name to create.
     */
    importAll({
        folderId,
        folderName,
    }?: {
        folderId?: string | null;
        folderName?: string;
    }): Promise<CompendiumDocument | CompendiumDocument[]>;

    /**
     * Import a Document into this Compendium Collection.
     * @param document The existing Document you wish to import
     * @return The imported Document instance
     */
    importDocument(document: TDocument): Promise<TDocument>;

    /**
     * Create a new Entity within this Compendium Pack using provided data
     * @param data  Data with which to create the entry
     * @return      A Promise which resolves to the created Entity once the operation is complete
     */
    createEntity(data: any): Promise<TDocument>;

    /**
     * Delete a single Compendium entry by its provided _id
     * @param id    The entry ID to delete
     * @return      A Promise which resolves to the deleted entry ID once the operation is complete
     */
    deleteEntity(id: string): Promise<string>;

    /**
     * Request that a Compendium pack be migrated to the latest System data template
     */
    migrate(options: any): Promise<CompendiumCollection>;

    /**
     * Customize Compendium closing behavior to toggle the sidebar folder status icon
     */
    close(): any;

    /**
     * Register event listeners for Compendium directories
     */
    activateListeners(html: JQuery): void;

    /**
     * Handle compendium filtering through search field
     * Toggle the visibility of indexed compendium entries by name (for now) match
     */
    protected _onSearch(searchString: string): void;

    /**
     * Handle opening a single compendium entry by invoking the configured entity class and its sheet
     */
    protected _onEntry(entryId: string): Promise<void>;

    /**
     * Handle a new drag event from the compendium, create a placeholder token for dropping the item
     */
    protected _onDragStart(event: Event | JQuery.Event): boolean;

    /**
     * Allow data transfer events to be dragged over this as a drop zone
     */
    protected _onDragOver(event: Event | JQuery.Event): boolean;

    /**
     * Handle data being dropped into a Compendium pack
     */
    protected _onDrop(event: Event | JQuery.Event): Promise<boolean>;

    /**
     * Render the ContextMenu which applies to each compendium entry
     */
    protected _contextMenu(html: JQuery | HTMLElement): void;
}
