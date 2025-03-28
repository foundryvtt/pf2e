import { ApplicationConfiguration } from "../../../../client-esm/applications/_types.js";
import type ApplicationV2 from "../../../../client-esm/applications/api/application.d.ts";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
} from "../../../../client-esm/applications/api/handlebars-application.js";

declare global {
    class CompendiumDirectory extends HandlebarsApplicationMixin(ApplicationV2) {
        static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

        /** A reference to the currently active compendium types. If empty, all types are shown. */
        activeFilters: Set<CompendiumDocumentType>;

        entryType: "Compendium";

        entryPartial: string;

        protected _entryAlreadyExists(entry: CompendiumIndexData | CompendiumDocument): boolean;

        protected _getEntryDragData(entryId: string): { type: "Compendium"; id: string };

        protected _entryIsSelf(
            entry: CompendiumIndexData | CompendiumDocument,
            otherEntry: CompendiumIndexData | CompendiumDocument,
        ): boolean;

        /**
         * Sort a relative entry within a collection
         * @param entry               The entry to sort
         * @param sortData            The sort data
         * @param sortData.sortKey    The sort key to use for sorting
         * @param sortData.sortBefore Sort before the target?
         * @param sortData.updateData Additional data to update on the entry
         * @returns The sorted entry
         */
        protected _sortRelative<TEntry extends CompendiumIndexData | CompendiumDocument>(
            entry: TEntry,
            sortData: { sortKey: string; sortBefore: boolean; updateData: Record<string, unknown> },
        ): Promise<TEntry>;

        protected override _onRender(context: object, options: HandlebarsRenderOptions): Promise<void>;

        protected override _prepareContext(
            options: DeepPartial<HandlebarsRenderOptions>,
        ): Promise<CompendiumDirectoryData>;

        /** Compendium sidebar Context Menu creation */
        protected _contextMenu(html: HTMLElement): void;

        /**
         * Get the sidebar directory entry context options
         * @return The sidebar entry context options
         */
        protected _getEntryContextOptions(): EntryContextOption[];

        /** Handle a Compendium Pack creation request */
        protected _onCreateCompendium(event: Event): Promise<boolean>;

        /**
         * Handle a Compendium Pack deletion request
         * @param pack The pack object requested for deletion
         */
        protected _onDeleteCompendium(pack: CompendiumCollection): Promise<boolean>;

        protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;

        /* -------------------------------------------- */
        /*  Drag & Drop                                 */
        /* -------------------------------------------- */

        /**
         * Determine if the given user has permission to drop entries into the compendium directory.
         * @param selector The CSS selector of the dragged element.
         */
        protected _canDragDrop(selector: string): boolean;

        /**
         * Determine if the given user has permission to drag packs and folders in the directory.
         * @param selector The CSS selector of the target element.
         */
        protected _canDragStart(selector: string): boolean;

        /**
         * Test if the given pack is already present in this directory.
         * @param pack The compendium pack.
         */
        protected _entryAlreadyExists(pack: CompendiumCollection): boolean;

        /**
         * Determine whether a given directory entry belongs to the given folder.
         * @param pack   The compendium pack.
         * @param folder The target folder ID.
         */
        _entryBelongsToFolder(pack: CompendiumCollection, folder: string): boolean;

        /**
         * Get the pack instance from its dropped data.
         * @param data  The drag data.
         */
        protected _getDroppedEntryFromData(data: object): Promise<CompendiumCollection>;

        /**
         * Get drag data for a compendium in this directory.
         * @param collection  The pack's collection ID.
         */
        protected _getEntryDragData(collection: string): { collection: string; type: "Compendium" };

        /**
         * Get drag data for a folder in this directory.
         * @param folderId  The folder ID.
         */
        protected _getFolderDragData(folderId: string): object;

        /**
         * Handle dropping a new pack into this directory.
         * @param target The drop target element.
         * @param data   The drop data.
         */
        protected _handleDroppedEntry(target: HTMLElement, data: object): Promise<void>;

        /**
         * Handle dropping a folder onto the directory.
         * @param target The drop target element.
         * @param data   The drop data.
         */
        protected _handleDroppedFolder(target: HTMLElement, data: object): Promise<void>;

        /**
         * Highlight folders as drop targets when a drag event enters or exits their area.
         * @param event The in-progress drag event.
         */
        protected _onDragHighlight(event: DragEvent): void;

        /**
         * Handle drag events over the directory.
         */
        protected _onDragOver(event: DragEvent): void;

        /** @override */
        protected _onDragStart(event: DragEvent): void;

        /** @override */
        protected _onDrop(event: DragEvent): void;
    }

    type PackSummaryByEntity = Record<CompendiumDocumentType, PackSummary>;

    interface CompendiumDirectoryData {
        user: User;
        packs: PackSummaryByEntity;
    }

    interface PackSummaryData {
        options: ApplicationOptions;
        appId: number;
        metadata: CompendiumMetadata;
        locked: boolean;
        private: boolean;
        index: unknown[];
    }

    interface PackSummary {
        label: CompendiumDocumentType;
        packs: PackSummaryData[];
    }
}
