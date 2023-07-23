/**
 * The Application responsible for displaying and editing a single JournalEntryPage document.
 * @param object The JournalEntryPage instance which is being edited.
 * @param [options] Application options.
 */
declare class JournalPageSheet<
    TDocument extends JournalEntryPage<JournalEntry | null>
> extends DocumentSheet<TDocument> {
    constructor(object: TDocument, options?: DocumentSheetOptions);
}

declare class JournalTextPageSheet<
    TDocument extends JournalEntryPage<JournalEntry | null>
> extends JournalPageSheet<TDocument> {
    /* Declare the format that we edit text content in for this sheet so we can perform conversions as necessary. */
    static get format(): number;

    /** * Determine if any editors are dirty. */
    isEditorDirty(): boolean;
}

declare class JournalTextTinyMCESheet<
    TDocument extends JournalEntryPage<JournalEntry | null>
> extends JournalPageSheet<TDocument> {}
