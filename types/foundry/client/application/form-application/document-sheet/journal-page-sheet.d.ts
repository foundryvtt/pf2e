/**
 * The Application responsible for displaying and editing a single JournalEntryPage document.
 * @param object The JournalEntryPage instance which is being edited.
 * @param [options] Application options.
 */
declare class JournalPageSheet<
    TJournalEntryPage extends JournalEntryPage<JournalEntry | null>
> extends DocumentSheet<TJournalEntryPage> {
    constructor(object: TJournalEntryPage, options?: DocumentSheetOptions);
}

declare class JournalTextPageSheet<
    TJournalEntryPage extends JournalEntryPage<JournalEntry | null>
> extends JournalPageSheet<TJournalEntryPage> {
    /* Declare the format that we edit text content in for this sheet so we can perform conversions as necessary. */
    static get format(): number;

    /** * Determine if any editors are dirty. */
    isEditorDirty(): boolean;
}

declare class JournalTextTinyMCESheet extends JournalPageSheet<JournalEntryPage<JournalEntry | null>> {}
