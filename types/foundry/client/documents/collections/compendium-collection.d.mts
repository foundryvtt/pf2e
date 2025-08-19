import { CompendiumDocumentType, CompendiumUUID } from "@client/utils/helpers.mjs";
import {
    DatabaseAction,
    DatabaseCreateOperation,
    DatabaseOperation,
    DatabaseUpdateOperation,
} from "@common/abstract/_module.mjs";
import { DocumentOwnershipLevel, DocumentOwnershipString, ImageFilePath } from "@common/constants.mjs";
import Collection from "@common/utils/collection.mjs";
import { ApplicationRenderOptions } from "../../applications/_types.mjs";
import { CompendiumDocument, User } from "../_module.mjs";
import DocumentCollection from "../abstract/document-collection.mjs";

/**
 * A singleton Collection of Compendium-level Document objects within the Foundry Virtual Tabletop.
 * Each Compendium pack has its own associated instance of the CompendiumCollection class which contains its contents.
 * @param metadata The compendium metadata, an object provided by game.data
 */
export default abstract class CompendiumCollection<
    TDocument extends CompendiumDocument = CompendiumDocument,
> extends DocumentCollection<TDocument> {
    constructor(metadata: CompendiumMetadata<TDocument>, options?: ApplicationRenderOptions);

    /** The compendium metadata which defines the compendium content and location */
    metadata: CompendiumMetadata<TDocument>;

    /** A subsidiary collection which contains the more minimal index of the pack */
    index: Collection<string, CompendiumIndexData>;

    /** A debounced function which will clear the contents of the Compendium pack if it is not accessed frequently. */
    protected _flush: () => unknown;

    /** Has this Compendium pack been fully indexed? */
    indexed: boolean;

    /**
     * The amount of time that Document instances within this CompendiumCollection are held in memory.
     * Accessing the contents of the Compendium pack extends the duration of this lifetime.
     */
    static CACHE_LIFETIME_SECONDS: number;

    /** The named game setting which contains Compendium configurations. */
    static CONFIG_SETTING: "compendiumConfiguration";

    /** The default index fields which should be retrieved for each Compendium document type */
    static INDEX_FIELDS: Record<CompendiumDocumentType, string[]>;

    /**
     * Create a new Compendium Collection using provided metadata.
     * @param metadata The compendium metadata used to create the new pack
     * @param options  Additional options which modify the Compendium creation request
     */
    static createCompendium<T extends CompendiumDocument>(
        metadata: CompendiumMetadata<T>,
        options?: Record<string, unknown>,
    ): Promise<CompendiumCollection<T>>;

    /** The canonical Compendium name - comprised of the originating package and the pack name */
    get collection(): string;

    /** Access the compendium configuration data for this pack */
    get config(): Record<string, unknown>;

    override get documentName(): TDocument["documentName"];

    /** Track whether the Compendium Collection is locked for editing */
    get locked(): boolean;

    /** A convenience reference to the label which should be used as the title for the Compendium pack. */
    get title(): string;

    override get(key: string, options?: Record<string, unknown>): TDocument | undefined;

    override set(id: string, document: TDocument): this;

    override delete(id: string): boolean;

    /** Load the Compendium index and cache it as the keys and values of the Collection. */
    getIndex<T extends CompendiumIndexData = CompendiumIndexData>(options?: {
        fields: string[];
    }): Promise<Collection<string, T>>;

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

    testUserPermission(
        user: foundry.documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;

    protected override _onCreateDocuments(
        documents: TDocument[],
        result: TDocument["_source"][],
        options: DatabaseCreateOperation<null>,
        userId: string,
    ): void;

    protected override _onUpdateDocuments(
        documents: TDocument[],
        result: TDocument["_source"][],
        options: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    protected override _onDeleteDocuments(
        documents: TDocument[],
        result: string[],
        options: DatabaseCreateOperation<null>,
        userId: string,
    ): void;

    /** Follow-up actions taken when Documents within this Compendium pack are modified */
    override _onModifyContents(
        action: DatabaseAction,
        documents: TDocument[],
        result: unknown[],
        operation: DatabaseOperation<null>,
        user: User,
    ): void;
}

export interface CompendiumMetadata<T extends CompendiumDocument = CompendiumDocument> {
    readonly type: T["documentName"];
    id: string;
    name: string;
    label: string;
    path: string;
    private?: string;
    package?: string;
    packageName: string;
    packageType: "world" | "system" | "module";
    system: string;
}

export interface CompendiumIndexData {
    _id: string;
    type: string;
    name: string;
    img: ImageFilePath;
    uuid: CompendiumUUID;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}
