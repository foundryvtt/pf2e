import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { Actor, BaseFolder, BaseUser, Item, JournalEntry, Macro, RollTable, Scene } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";
import WorldCollection from "./abstract/world-collection.mjs";
import CompendiumCollection from "./collections/compendium-collection.mjs";

type BaseFolderStatic = typeof BaseFolder;
interface ClientBaseFolderStatic extends BaseFolderStatic, ClientDocumentStatic {}

declare const ClientBaseFolder: {
    new (...args: any): BaseFolder & ClientDocument<null>;
} & ClientBaseFolderStatic;

interface ClientBaseFolder extends InstanceType<typeof ClientBaseFolder> {}

/**
 * The client-side Folder document which extends the common BaseFolder model.
 *
 * @see {@link Folders}                     The world-level collection of Folder documents
 * @see {@link FolderConfig}                The Folder configuration application
 */
export default class Folder<TDocument extends EnfolderableDocument = EnfolderableDocument> extends ClientBaseFolder {
    /** The depth of this folder in its sidebar tree */
    depth: number;

    /**
     * An array of other Folders which are the displayed children of this one. This differs from the results of
     * {@link Folder.getSubfolders} because reports the subset of child folders which  are displayed to the current User
     * in the UI.
     */
    children: Folder<TDocument>[];

    /** Return whether the folder is displayed in the sidebar to the current User. */
    displayed: boolean;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The array of the Document instances which are contained within this Folder,
     * unless it's a Folder inside a Compendium pack, in which case it's the array
     * of objects inside the index of the pack that are contained in this Folder.
     */
    get contents(): TDocument[];

    set contents(value: TDocument[]);

    /** Return a reference to the Document type which is contained within this Folder. */
    get documentClass(): ConstructorOf<TDocument>;

    /** Return a reference to the WorldCollection instance which provides Documents to this Folder. */
    get documentCollection(): WorldCollection<TDocument>;

    /** Return whether the folder is currently expanded within the sidebar interface. */
    get expanded(): boolean;

    /** Return the list of ancestors of this folder, starting with the parent. */
    get ancestors(): Folder<TDocument>[];

    /** A reference to the parent Folder if one is set, otherwise null. */
    get parentFolder(): this | null;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    /**
     * Create a new Folder by rendering a dialog window to provide basic creation details
     * @param data Initial data with which to populate the creation form
     * @param options Initial positioning and sizing options for the dialog form
     * @return An active FolderConfig instance for creating the new Folder entity
     */
    static override createDialog<T extends ClientDocument>(
        this: ConstructorOf<T>,
        data?: object,
        createOptions?: Partial<DatabaseCreateOperation<Document | null>>,
        options?: {
            folders?: { id: string; name: string }[];
            types?: string[];
            template?: string;
            context?: object;
        },
    ): Promise<T | null>;

    /**
     * Export all Documents contained in this Folder to a given Compendium pack.
     * Optionally update existing Documents within the Pack by name, otherwise append all new entries.
     * @param pack         A Compendium pack to which the entities will be exported
     * @param updateByName Update existing entries in the Compendium pack, matching by name
     * @return The updated Compendium Collection instance
     */
    exportToCompendium(
        pack: CompendiumCollection<TDocument>,
        { updateByName }?: { updateByName?: boolean },
    ): Promise<CompendiumCollection<TDocument>>;

    /**
     * Provide a dialog form that allows for exporting the contents of a Folder into an eligible Compendium pack.
     * @param pack    A pack ID to set as the default choice in the select input
     * @param options Additional options passed to the Dialog.prompt method
     * @return A Promise which resolves or rejects once the dialog has been submitted or closed
     */
    exportDialog(pack: string, options?: Record<string, unknown>): Promise<void>;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /**
     * Get the Folder documents which are sub-folders of the current folder, either direct children or recursively.
     * @param [recursive=false] Identify child folders recursively, if false only direct children are returned
     * @returns An array of Folder documents which are subfolders of this one
     */
    getSubfolders(recursive?: boolean): Folder<TDocument>[];

    /**
     * Get the Folder documents which are parent folders of the current folder or any if its parents.
     * @returns An array of Folder documents which are parent folders of this one
     */
    getParentFolders(): Folder<TDocument>[];
}

export type EnfolderableDocument = Actor<null> | Item<null> | Macro | Scene | JournalEntry | RollTable;

export {};
