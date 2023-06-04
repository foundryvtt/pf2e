export {};

declare global {
    /**
     * A singleton Collection of world-level Document objects within the Foundry Virtual Tabletop.
     * Each primary Document type has an associated subclass of WorldCollection which contains them.
     * @param data An array of data objects from which to create Document instances
     */
    abstract class WorldCollection<TDocument extends WorldDocument> extends DocumentCollection<TDocument> {
        constructor(data?: TDocument["_source"][]);

        /** The source data is, itself, a mapping of IDs to data objects */
        protected readonly _source: TDocument["_source"];

        /** An Array of application references which will be automatically updated when the collection content changes */
        apps: Application[];

        /**
         * Initialize the WorldCollection object by constructing its contained Document instances
         * @param data
         */
        protected _initialize(data: TDocument["_source"][]): void;

        /* -------------------------------------------- */
        /*  Directory Collection Mixin                  */
        /* -------------------------------------------- */

        /** The built tree structure of the DocumentCollection */
        get tree(): object;

        /** The current search mode for this collection */
        get searchMode(): "full" | "name";

        /** Toggle the search mode for this collection between "name" and "full" text search */
        toggleSearchMode(): void;

        /** The current sort mode used to order the top level entries in this collection */
        get sortingMode(): "a" | "m";

        /** Toggle the sorting mode for this collection between "a" (Alphabetical) and "m" (Manual by sort property) */
        toggleSortingMode(): void;

        /** The maximum depth of folder nesting which is allowed in this collection */
        get maxFolderDepth(): number;

        /** Return a reference to list of entries which are visible to the User in this tree */
        _getVisibleTreeContents(): TDocument[];

        initializeTree(): void;

        /** Sort two Entries by name, alphabetically. */
        static _sortAlphabetical(a: Document, b: Document): number;

        /** Sort two Entries using their numeric sort fields. */
        static _sortStandard(a: Document, b: Document): number;

        /* -------------------------------------------- */
        /*  Collection Properties                       */
        /* -------------------------------------------- */

        override get documentName(): string | null;

        /** The base Document type which is contained within this WorldCollection */
        static documentName: string | null;

        /** Reference the set of Folders which contain documents in this collection */
        get folders(): Collection<Folder>;

        /**
         * Return a reference to the SidebarDirectory application for this WorldCollection, or null if it has not yet
         * been created.
         */
        get directory(): DocumentDirectory<TDocument> | null;

        /** Return a reference to the singleton instance of this WorldCollection, or null if it has not yet been created. */
        static get instance(): WorldCollection<WorldDocument>;

        /* -------------------------------------------- */
        /*  Collection Methods                          */
        /* -------------------------------------------- */

        override set(id: string, document: TDocument): this;

        override delete(id: string): boolean;

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
            options?: DocumentModificationContext<null>
        ): Promise<TDocument | null>;

        /**
         * Apply data transformations when importing a Document from a Compendium pack
         * @param document  The source Document, or a plain data object
         * @param [options] Additional options which modify how the document is imported
         * @param [options.addFlags=false]        Add flags which track the import source
         * @param [options.clearSort=true]        Clear the currently assigned folder and sort order
         * @param [options.clearPermissions=true] Clear document permissions
         * @param [options.keepId=false]          Retain the Document id from the source Compendium
         * @return The processed data ready for world Document creation
         */
        fromCompendium(
            document: TDocument | TDocument["_source"],
            options?: FromCompendiumOptions
        ): TDocument["_source"];

        /* -------------------------------------------- */
        /*  Sheet Registration Methods                  */
        /* -------------------------------------------- */

        /**
         * Register a Document sheet class as a candidate which can be used to display Documents of a given type.
         * See {@link DocumentSheetConfig.registerSheet} for details.
         * @static
         * @param args Arguments forwarded to the DocumentSheetConfig.registerSheet method
         *
         * @example Register a new ActorSheet subclass for use with certain Actor types.
         * ```js
         * Actors.registerSheet("dnd5e", ActorSheet5eCharacter, { types: ["character], makeDefault: true });
         * ```
         */
        static registerSheet(...args: DropFirst<Parameters<(typeof DocumentSheetConfig)["registerSheet"]>>): void;

        /**
         * Unregister a Document sheet class, removing it from the list of available sheet Applications to use.
         * See {@link DocumentSheetConfig.unregisterSheet} for detauls.
         * @static
         * @param args Arguments forwarded to the DocumentSheetConfig.unregisterSheet method
         *
         * @example Deregister the default ActorSheet subclass to replace it with others.
         * ```js
         * Actors.unregisterSheet("core", ActorSheet);
         * ```
         */
        static unregisterSheet(...args: DropFirst<Parameters<(typeof DocumentSheetConfig)["unregisterSheet"]>>): void;

        static get registeredSheets(): DocumentSheet[];
    }

    interface FromCompendiumOptions {
        addFlags?: boolean;
        clearSort?: boolean;
        clearPermissions?: boolean;
        keepId?: boolean;
    }
}
