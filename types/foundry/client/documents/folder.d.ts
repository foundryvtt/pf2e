import type { ClientBaseFolder } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Folder document which extends the common BaseFolder model.
     *
     * @see {@link Folders}                     The world-level collection of Folder documents
     * @see {@link FolderConfig}                The Folder configuration application
     */
    class Folder<TDocument extends EnfolderableDocument = EnfolderableDocument> extends ClientBaseFolder {
        /**
         * Create a new Folder by rendering a dialog window to provide basic creation details
         * @param data Initial data with which to populate the creation form
         * @param options Initial positioning and sizing options for the dialog form
         * @return An active FolderConfig instance for creating the new Folder entity
         */
        static createDialog<TDocument extends foundry.abstract.Document>(
            this: ConstructorOf<TDocument>,
            data?: Record<string, unknown>,
            context?: {
                parent?: TDocument["parent"];
                pack?: Collection<TDocument> | null;
            } & Partial<FormApplicationOptions>
        ): Promise<TDocument | null>;

        /** The depth of this folder in its sidebar tree */
        depth: number;

        /** Return an array of the Document instances which are contained within this Folder. */
        get contents(): TDocument[];

        /** Return whether the folder is displayed in the sidebar to the current user */
        get displayed(): boolean;

        /** Return a reference to the Document type which is contained within this Folder. */
        get documentClass(): ConstructorOf<TDocument>;

        /** Return a reference to the WorldCollection instance which provides Documents to this Folder. */
        get documentCollection(): WorldCollection<TDocument>;

        /** Return whether the folder is currently expanded within the sidebar interface. */
        get expanded(): boolean;

        /** A reference to the parent Folder if one is set, otherwise null. */
        get parentFolder(): this | null;

        /** Return the named Entity type for elements in this folder. */
        get type(): string;

        /**
         * Export all Documents contained in this Folder to a given Compendium pack.
         * Optionally update existing Documents within the Pack by name, otherwise append all new entries.
         * @param pack         A Compendium pack to which the entities will be exported
         * @param updateByName Update existing entries in the Compendium pack, matching by name
         * @return The updated Compendium Collection instance
         */
        exportToCompendium(
            pack: CompendiumCollection<TDocument>,
            { updateByName }?: { updateByName?: boolean }
        ): Promise<CompendiumCollection<TDocument>>;

        /**
         * Provide a dialog form that allows for exporting the contents of a Folder into an eligible Compendium pack.
         * @param pack    A pack ID to set as the default choice in the select input
         * @param options Additional options passed to the Dialog.prompt method
         * @return A Promise which resolves or rejects once the dialog has been submitted or closed
         */
        exportDialog(pack: string, options?: Record<string, unknown>): Promise<void>;

        /**
         * Get the Folder documents which are sub-folders of the current folder, either direct children or recursively.
         * @param [recursive=false] Identify child folders recursively, if false only direct children are returned
         * @returns An array of Folder documents which are subfolders of this one
         */
        getSubfolders(recursive?: boolean): this[];

        protected override _onDelete(options: DocumentModificationContext<null>, userId: string): void;
    }

    type EnfolderableDocument = Actor<null> | Item<null> | Macro | Scene | JournalEntry | RollTable;
}
