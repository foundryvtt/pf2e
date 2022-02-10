export {};

declare global {
    /**
     * A singleton Collection of Compendium-level Document objects within the Foundry Virtual Tabletop.
     * Each Compendium pack has its own associated instance of the CompendiumCollection class which contains its contents.
     * @param metadata The compendium metadata, an object provided by game.data
     */
    abstract class CompendiumCollection<
        TDocument extends CompendiumDocument = CompendiumDocument
    > extends DocumentCollection<TDocument> {
        constructor(metadata: CompendiumMetadata<TDocument>, options?: ApplicationOptions);

        /** The compendium metadata which defines the compendium content and location */
        metadata: CompendiumMetadata<TDocument>;

        /** A subsidiary collection which contains the more minimal index of the pack */
        index: CompendiumIndex;

        protected _flush: () => unknown;
        /**
         * The amount of time that Document instances within this CompendiumCollection are held in memory.
         * Accessing the contents of the Compendium pack extends the duration of this lifetime.
         */
        static CACHE_LIFETIME_SECONDS: number;

        /** The named game setting which contains Compendium configurations. */
        static CONFIG_SETTING: "compendiumConfiguration";

        /**
         * Create a new Compendium Collection using provided metadata.
         * @param metadata The compendium metadata used to create the new pack
         * @param options  Additional options which modify the Compendium creation request
         */
        static createCompendium<T extends CompendiumDocument>(
            metadata: CompendiumMetadata<T>,
            options?: Record<string, unknown>
        ): Promise<CompendiumCollection<T>>;

        /** The canonical Compendium name - comprised of the originating package and the pack name */
        get collection(): string;

        /** Access the compendium configuration data for this pack */
        get config(): Record<string, unknown>;

        override get documentName(): TDocument["documentName"];

        /** Track whether the Compendium Collection is locked for editing */
        get locked(): boolean;

        /** Track whether the Compendium Collection is private */
        get private(): boolean;

        /** A convenience reference to the label which should be used as the title for the Compendium pack. */
        get title(): string;

        override get(key: string, options?: Record<string, unknown>): TDocument | undefined;

        override set(id: string, document: TDocument): this;

        override delete(id: string): boolean;

        /** Load the Compendium index and cache it as the keys and values of the Collection. */
        getIndex(options?: { fields: string[] }): Promise<CompendiumIndex>;

        /**
         * Get a single Document from this Compendium by ID.
         * The document may already be locally cached, otherwise it is retrieved from the server.
         * @param id The requested Document id
         * @returns The retrieved Document instance
         */
        getDocument(id: string): Promise<TDocument | undefined>;

        /**
         * Load multiple documents from the Compendium pack using a provided query object.
         * @param query A database query used to retrieve documents from the underlying database
         * @returns The retrieved Document instances
         */
        getDocuments(query?: Record<string, unknown>): Promise<TDocument[]>;

        /**
         * Import a Document into this Compendium Collection.
         * @param document The existing Document you wish to import
         * @return The imported Document instance
         */
        importDocument(document: TDocument): Promise<TDocument>;

        /**
         * Fully import the contents of a Compendium pack into a World folder.
         * @param [folderId]   An existing Folder _id to use.
         * @param [folderName] A new Folder name to create.
         * @param [options]    Additional options forwarded to Document.createDocuments
         * @return The imported Documents, now existing within the World
         */
        importAll({
            folderId,
            folderName,
            options,
        }?: {
            folderId?: string | null;
            folderName?: string;
            options?: Record<string, unknown>;
        }): Promise<TDocument[]>;

        /**
         * Add a Document to the index, capturing it's relevant index attributes
         * @param document The document to index
         */
        indexDocument(document: TDocument): void;

        /**
         * Assign configuration metadata settings to the compendium pack
         * @param settings The object of compendium settings to define
         * @return A Promise which resolves once the setting is updated
         */
        configure(settings?: Record<string, unknown>): Promise<void>;

        /**
         * Delete an existing world-level Compendium Collection.
         * This action may only be performed for world-level packs by a Gamemaster User.
         */
        deleteCompendium(): Promise<this>;

        /**
         * Duplicate a compendium pack to the current World.
         * @param label A new Compendium label
         */
        duplicateCompendium({ label }?: { label?: string }): Promise<this>;

        /** Validate that the current user is able to modify content of this Compendium pack */
        protected _assertUserCanModify(): boolean;

        /** Request that a Compendium pack be migrated to the latest System data template */
        migrate(options?: Record<string, unknown>): Promise<this>;

        protected override _onCreateDocuments(
            documents: TDocument[],
            result: TDocument["data"]["_source"][],
            options: DocumentModificationContext,
            userId: string
        ): void;

        protected override _onUpdateDocuments(
            documents: TDocument[],
            result: TDocument["data"]["_source"][],
            options: DocumentModificationContext,
            userId: string
        ): void;

        protected override _onDeleteDocuments(
            documents: TDocument[],
            result: TDocument["data"]["_source"][],
            options: DocumentModificationContext,
            userId: string
        ): void;

        /** Follow-up actions taken when Documents within this Compendium pack are modified */
        protected _onModifyContents(documents: TDocument[], options: DocumentModificationContext, userId: string): void;
    }

    type CompendiumDocumentType = typeof CONST.COMPENDIUM_ENTITY_TYPES[number];
    type CompendiumUUID = `Compendium.${string}.${string}`;
    type DocumentUUID = `${CompendiumDocumentType}.${string}` | CompendiumUUID | TokenDocumentUUID;
    function fromUuid<T extends ClientDocument = ClientDocument>(uuid: string): Promise<T | null>;

    interface CompendiumMetadata<T extends CompendiumDocument = CompendiumDocument> {
        readonly type: T extends Actor
            ? "Actor"
            : T extends Item
            ? "Item"
            : T extends JournalEntry
            ? "JournalEntry"
            : T extends Macro
            ? "Macro"
            : T extends Playlist
            ? "Playlist"
            : T extends RollTable
            ? "RollTable"
            : T extends Scene
            ? "Scene"
            : CompendiumDocumentType;
        name: string;
        label: string;
        path: string;
        private?: string;
        module?: string;
        package?: string;
        system: string;
    }

    interface CompendiumIndexData {
        _id: string;
        type: string;
        name: string;
        [key: string]: any;
    }

    type CompendiumIndex = Collection<CompendiumIndexData>;

    type CompendiumDocument = Actor | Item | JournalEntry | Macro | Playlist | RollTable | Scene;
}
