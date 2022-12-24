declare module foundry {
    module data {
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
            img: ImagePath;
            folder: string | null;
            sort: number;
            ownership: Record<string, PermissionLevel>;
            flags: Record<string, Record<string, unknown>>;
        }

        class JournalEntryData<
            TDocument extends documents.BaseJournalEntry = documents.BaseJournalEntry,
            TPage extends documents.BaseJournalEntryPage = documents.BaseJournalEntryPage
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            pages: abstract.EmbeddedCollection<TPage>;
        }

        interface JournalEntryData extends JournalEntrySource {
            readonly _source: JournalEntrySource;
        }
    }
}
