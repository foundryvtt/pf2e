/**
 * The Application responsible for displaying and editing a single JournalEntryPage document.
 * @extends {DocumentSheet}
 * @param {JournalEntryPage} object         The JournalEntryPage instance which is being edited.
 * @param {DocumentSheetOptions} [options]  Application options.
 */
declare class JournalPageSheet<
    TJournalEntryPage extends JournalEntryPage = JournalEntryPage
> extends DocumentSheet<TJournalEntryPage> {
    constructor(object: TJournalEntryPage, options?: DocumentSheetOptions);
}
