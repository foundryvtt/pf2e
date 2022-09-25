/**
 * The Application responsible for displaying and editing a single JournalEntryPage document.
 * @param object    The JournalEntryPage instance which is being edited.
 * @param [options] Application options.
 */
declare class JournalPageSheet<
    TJournalEntryPage extends JournalEntryPage = JournalEntryPage
> extends DocumentSheet<TJournalEntryPage> {
    constructor(object: TJournalEntryPage, options?: DocumentSheetOptions);
}

declare class JournalTextPageSheet extends JournalPageSheet {
    /* Declare the format that we edit text content in for this sheet so we can perform conversions as necessary. */
    static get format(): number;

    /** * Determine if any editors are dirty. */
    isEditorDirty(): boolean;
}

declare class JournalTextTinyMCESheet extends JournalPageSheet {}
