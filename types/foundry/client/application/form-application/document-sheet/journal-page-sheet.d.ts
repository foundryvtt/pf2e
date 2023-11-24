import type * as TinyMCE from "tinymce";

declare global {
    /**
     * The Application responsible for displaying and editing a single JournalEntryPage document.
     * @param object    The JournalEntryPage instance which is being edited.
     * @param [options] Application options.
     */
    class JournalPageSheet<TDocument extends JournalEntryPage<JournalEntry | null>> extends DocumentSheet<TDocument> {
        /** The table of contents for this JournalTextPageSheet. */
        toc: Record<string, JournalEntryPageHeading>;

        static override get defaultOptions(): DocumentSheetOptions;

        override get template(): string;

        override get title(): string;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        override getData(
            options?: Partial<DocumentSheetOptions> | undefined,
        ): DocumentSheetData<TDocument> | Promise<DocumentSheetData<TDocument>>;

        protected override _renderInner(
            data: FormApplicationData<TDocument>,
            options: RenderOptions,
        ): Promise<JQuery<HTMLElement>>;

        /* -------------------------------------------- */
        /*  Text Secrets Management                     */
        /* -------------------------------------------- */

        protected override _getSecretContent(secret: HTMLElement): string;

        protected override _updateSecret(secret: HTMLElement, content: string): Promise<TDocument>;

        /* -------------------------------------------- */
        /*  Text Editor Integration                     */
        /* -------------------------------------------- */

        override activateEditor(
            name: string,
            options?: EditorCreateOptions | undefined,
            initialContent?: string | undefined,
        ): Promise<TinyMCE.Editor | ProseMirror.EditorView>;

        /**
         * Update the parent sheet if it is open when the server autosaves the contents of this editor.
         * @param html The updated editor contents.
         */
        onAutosave(html: string): void;

        /** Update the UI appropriately when receiving new steps from another client. */
        onNewSteps(): void;
    }

    /** The Application responsible for displaying and editing a single JournalEntryPage image document. */
    class JournalImagePageSheet<
        TDocument extends JournalEntryPage<JournalEntry | null>,
    > extends JournalPageSheet<TDocument> {
        static override get defaultOptions(): DocumentSheetOptions;
    }

    class JournalTextPageSheet<
        TDocument extends JournalEntryPage<JournalEntry | null>,
    > extends JournalPageSheet<TDocument> {
        /** Bi-directional HTML <-> Markdown converter. */
        protected static _converter: object;

        /**
         * Declare the format that we edit text content in for this sheet so we can perform conversions as necessary.
         */
        static get format(): number;

        static override get defaultOptions(): DocumentSheetOptions;

        override getData(options?: Partial<DocumentSheetOptions>): Promise<DocumentSheetData<TDocument>>;

        override close(options?: { force?: boolean }): Promise<void>;

        protected override _render(force: boolean, options: RenderOptions): Promise<void>;

        /** Determine if any editors are dirty. */
        isEditorDirty(): boolean;

        protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

        /**
         * Lazily convert text formats if we detect the document being saved in a different format.
         * @param renderData Render data.
         */
        protected _convertFormats(renderData?: Record<string, unknown>): void;
    }

    class JournalTextTinyMCESheet<
        TDocument extends JournalEntryPage<JournalEntry | null>,
    > extends JournalTextPageSheet<TDocument> {
        override getData(options?: DocumentSheetOptions): Promise<DocumentSheetData<TDocument>>;

        override close(options?: { force?: boolean }): Promise<void>;

        protected override _render(force?: boolean, options?: RenderOptions): Promise<void>;
    }

    interface JournalTextTinyMCESheet<TDocument extends JournalEntryPage<JournalEntry | null>>
        extends JournalTextPageSheet<TDocument> {
        activateEditor(
            name: string,
            options?: Partial<TinyMCE.EditorOptions>,
            initialContent?: string,
        ): Promise<TinyMCE.Editor>;
    }
}
