declare module foundry {
    module documents {
        /** The JournalEntryPage document model. */
        class BaseJournalEntryPage extends abstract.Document {
            static override get schema(): typeof data.JournalEntryPageData;

            static override get metadata(): JournalEntryPageMetadata;
        }

        interface BaseJournalEntryPage {
            readonly data: data.JournalEntryPageData<this>;

            readonly parent: BaseJournalEntry | null;

            get documentName(): (typeof BaseJournalEntryPage)["metadata"]["name"];
        }
    }

    interface JournalEntryPageMetadata extends abstract.DocumentMetadata {
        name: "JournalEntryPage";
        collection: "pages";
        indexed: true;
        label: "DOCUMENT.JournalEntryPage";
        labelPlural: "DOCUMENT.JournalEntryPages";
        coreTypes: ["image", "pdf", "text", "video"];
    }
}
