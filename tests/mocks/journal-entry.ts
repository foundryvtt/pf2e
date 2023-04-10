export class MockJournalEntry {
    _source: foundry.documents.JournalEntrySource;

    readonly pages: object[] = [];

    constructor(source: foundry.documents.JournalEntrySource) {
        this._source = duplicate(source);
        this.pages = source.pages;
    }
}
