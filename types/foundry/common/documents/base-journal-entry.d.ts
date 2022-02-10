declare module foundry {
    module documents {
        /** The JournalEntry document model. */
        class BaseJournalEntry extends abstract.Document {
            static override get schema(): typeof data.JournalEntryData;

            static override get metadata(): JournalEntryMetadata;
        }

        interface BaseJournalEntry {
            readonly data: data.JournalEntryData<this>;

            readonly parent: null;

            get documentName(): typeof BaseJournalEntry["metadata"]["name"];
        }
    }

    interface JournalEntryMetadata extends abstract.DocumentMetadata {
        name: "JournalEntry";
        collection: "journal";
        label: "DOCUMENT.JournalEntry";
        isPrimary: true;
        permissions: Omit<abstract.DocumentMetadata["permissions"], "create"> & {
            create: "JOURNAL_CREATE";
        };
    }
}
