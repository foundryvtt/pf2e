import { NoteDocumentConstructor } from './constructors';

declare global {
    /**
     * The client-side Note embedded document which extends the common BaseNote abstraction.
     * Each Note document contains NoteData which defines its data schema.
     * @see {@link data.NoteData}                 The Note data schema
     * @see {@link documents.Scene}               The Scene document type which contains Note embedded documents
     * @see {@link applications.NoteConfig}       The Note configuration application
     */
    class NoteDocument extends NoteDocumentConstructor {
        /** The associated JournalEntry which is referenced by this Note */
        get entry(): JournalEntry;

        /** The text label used to annotate this Note */
        get label(): string;
    }

    interface NoteDocument {
        readonly parent: Scene | null;

        readonly _object: Note;
    }
}
