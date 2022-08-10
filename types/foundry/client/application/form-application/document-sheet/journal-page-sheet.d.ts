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
