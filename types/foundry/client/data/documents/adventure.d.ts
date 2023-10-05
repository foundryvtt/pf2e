import type { ClientBaseAdventure } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Adventure document which extends the common {@link foundry.documents.BaseAdventure} model.
     *
     * ### Hook Events
     * {@link hookEvents.preImportAdventure} emitted by Adventure#import
     * {@link hookEvents.importAdventure} emitted by Adventure#import
     */
    class Adventure extends ClientBaseAdventure {
        /**
         * Perform a full import workflow of this Adventure.
         * Create new and update existing documents within the World.
         * @param [options] Options which configure and customize the import process
         * @param [options.dialog=true] Display a warning dialog if existing documents would be overwritten
         * @returns The import result
         */
        import(options?: { dialog?: boolean } & Record<string, unknown>): Promise<AdventureImportResult>;

        /**
         * Prepare Adventure data for import into the World.
         * @param [options] Options passed in from the import dialog to configure the import behavior.
         * @param [options.importFields]  A subset of adventure fields to import.
         */
        prepareImport(options?: { importFields?: string[] }): Promise<AdventureImportData>;

        /**
         * Execute an Adventure import workflow, creating and updating documents in the World.
         * @param Prepared adventure data to import
         * @returns The import result
         */
        importContent(data?: Partial<AdventureImportData>): AdventureImportResult;
    }

    interface AdventureImportData {
        /** Arrays of document data to create, organized by document name */
        toCreate: Record<string, object[]>;
        /** Arrays of document data to update, organized by document name */
        toUpdate: Record<string, object[]>;
        /** The total count of documents to import */
        documentCount: number;
    }

    interface AdventureImportResult {
        /** Documents created as a result of the import, organized by document name */
        created: foundry.abstract.Document[];
        /** Documents updated as a result of the import, organized by document name */
        updated: foundry.abstract.Document[];
    }
}
