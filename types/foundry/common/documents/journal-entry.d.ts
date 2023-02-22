declare module foundry {
    module documents {
        /** The JournalEntry document model. */
        class BaseJournalEntry extends abstract.Document {
            static override get metadata(): JournalEntryMetadata;

            readonly pages: abstract.EmbeddedCollection<BaseJournalEntryPage<this>>;
        }

        interface BaseJournalEntry {
            readonly parent: null;

            readonly _source: JournalEntrySource;

            get documentName(): (typeof BaseJournalEntry)["metadata"]["name"];
        }

        /**
         * The data schema for a JournalEntry document.
         * @see BaseJournalEntry
         *
         * @param  data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id          The _id which uniquely identifies this JournalEntry document
         * @property name         The name of this JournalEntry
         * @property pages        The pages contained within this JournalEntry document
         * @property [img]        An image file path which provides the artwork for this JournalEntry
         * @property folder       The _id of a Folder which contains this JournalEntry
         * @property [sort]       The numeric sort value which orders this JournalEntry relative to its siblings
         * @property [permission] An object which configures user permissions to this JournalEntry
         * @property [flags={}]   An object of optional key/value flags
         */
        interface JournalEntrySource extends abstract.DocumentSource {
            _id: string;
            name: string;
            pages: JournalEntryPageSource[];
            content: string;
            img: ImageFilePath;
            folder: string | null;
            sort: number;
            ownership: Record<string, DocumentOwnershipLevel>;
            flags: Record<string, Record<string, unknown>>;
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
