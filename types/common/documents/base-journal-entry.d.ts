declare module foundry {
    module documents {
        /**The JournalEntry document model. */
        class BaseJournalEntry extends abstract.Document {
            /** @override */
            static get schema(): typeof data.JournalEntryData;

            /** @override */
            static get metadata(): JournalEntryMetadata;
        }

        interface BaseJournalEntry {
            readonly data: data.JournalEntryData<BaseJournalEntry>;
        }
    }

    interface JournalEntryMetadata extends abstract.DocumentMetadata {
        name: 'JournalEntry';
        collection: 'journal';
        label: 'DOCUMENT.JournalEntry';
        isPrimary: true;
        permissions: Omit<abstract.DocumentMetadata['permissions'], 'create'> & {
            create: 'JOURNAL_CREATE';
        };
    }
}
