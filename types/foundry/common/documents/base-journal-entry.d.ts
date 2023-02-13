declare module foundry {
    module documents {
        /** The JournalEntry document model. */
        class BaseJournalEntry extends abstract.Document {
            static override get schema(): typeof data.JournalEntryData;

            static override get metadata(): JournalEntryMetadata;

            get pages(): this["data"]["pages"];
        }

        interface BaseJournalEntry {
            readonly data: data.JournalEntryData<this>;

            readonly parent: null;

            get documentName(): (typeof BaseJournalEntry)["metadata"]["name"];
        }
    }

    interface JournalEntryMetadata extends abstract.DocumentMetadata {
        name: "JournalEntry";
        collection: "journal";
        indexed: true;
        compendiumIndexFields: ["_id", "name", "sort"];
        embedded: {
            JournalEntryPage: typeof documents.BaseJournalEntryPage;
        };
        label: "DOCUMENT.JournalEntry";
        labelPlural: "DOCUMENT.JournalEntries";
        isPrimary: true;
        permissions: Omit<abstract.DocumentMetadata["permissions"], "create"> & {
            create: "JOURNAL_CREATE";
        };
    }
}
