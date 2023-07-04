export {};

declare global {
    interface DocumentSheetConfigData<TDocument extends foundry.abstract.Document>
        extends FormApplicationData<TDocument> {
        isGM: boolean;
        object: TDocument;
        options: FormApplicationOptions;
        sheetClass: string;
        sheetClasses: Record<string, string>;
        defaultClass: string;
        blankLabel: string;
    }

    interface RegisterSheetOptions {
        label?: string | (() => string);
        types?: string[];
        makeDefault?: boolean;
        canBeDefault?: boolean;
    }

    /** Document Sheet Configuration Application */
    class DocumentSheetConfig<TDocument extends foundry.abstract.Document> extends FormApplication<TDocument> {
        static override get defaultOptions(): FormApplicationOptions;

        /** An array of pending sheet assignments which are submitted before other elements of the framework are ready. */
        protected static _pending: object[];

        override get title(): string;

        override getData(
            options?: Partial<FormApplicationOptions>
        ): DocumentSheetConfigData<TDocument> | Promise<DocumentSheetConfigData<TDocument>>;

        protected override _updateObject(event: Event, formData: FormApplicationData): Promise<void>;

        /* -------------------------------------------- */
        /*  Configuration Methods                       */
        /* -------------------------------------------- */

        /**
         * Initialize the configured Sheet preferences for Documents which support dynamic Sheet assignment
         * Create the configuration structure for supported documents
         * Process any pending sheet registrations
         * Update the default values from settings data
         */
        static initializeSheets(): void;

        protected static _getDocumentTypes(cls: foundry.abstract.Document, types?: string[]): string[];

        /**
         * Register a sheet class as a candidate which can be used to display documents of a given type
         * @param documentClass         The Document class for which to register a new Sheet option
         * @param scope                 Provide a unique namespace scope for this sheet
         * @param sheetClass            A defined Application class used to render the sheet
         * @param options               Additional options used for sheet registration
         * @param [options.label]       A human readable label for the sheet name, which will be localized
         * @param [options.types]       An array of document types for which this sheet should be used
         * @param [options.makeDefault] Whether to make this sheet the default for provided types
         */
        static registerSheet<T extends foundry.abstract.Document & { get sheet(): FormApplication<T> }>(
            documentClass: ConstructorOf<T>,
            scope: string,
            sheetClass: ConstructorOf<T["sheet"]>,
            options?: RegisterSheetOptions
        ): void;

        /** Perform the sheet registration */
        protected static _registerSheet(options: unknown): void;

        /**
         * Unregister a sheet class, removing it from the list of available Applications to use for a Document type
         * @param documentClass  The Document class for which to register a new Sheet option
         * @param scope            Provide a unique namespace scope for this sheet
         * @param sheetClass  A defined Application class used to render the sheet
         * @param types             An Array of types for which this sheet should be removed
         */
        static unregisterSheet<T extends foundry.abstract.Document & { get sheet(): FormApplication<T> }>(
            documentClass: ConstructorOf<T>,
            scope: string,
            sheetClass: ConstructorOf<T["sheet"]>,
            options?: { types: string[] }
        ): void;

        /** Perform the sheet de-registration */
        protected static _unregisterSheet(options: {
            documentClass: typeof foundry.abstract.Document;
            id: string;
            types: string[];
        }): void;

        /** Update the currently default Sheets using a new core world setting */
        static updateDefaultSheets(setting: {}): void;
    }
}
