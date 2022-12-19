// @ts-nocheck
export class FakeJournalEntry {
    _source: foundry.data.JournalEntrySource;

    readonly pages: object[] = [];

    constructor(source: foundry.data.JournalEntrySource) {
        this._source = duplicate(source);
        this.pages = source.pages;
    }
}
