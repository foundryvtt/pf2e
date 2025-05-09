import Note from "../canvas/placeables/note.mjs";
import { BaseNote, JournalEntry, JournalEntryPage, Scene } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";

declare const CanvasBaseNote: new <TParent extends Scene | null>(
    ...args: any
) => BaseNote<TParent> & CanvasDocument<TParent>;

interface CanvasBaseNote<TParent extends Scene | null> extends InstanceType<typeof CanvasBaseNote<TParent>> {}

/**
 * The client-side Note embedded document which extends the common BaseNote abstraction.
 * Each Note document contains NoteData which defines its data schema.
 * @see {@link Scene}               The Scene document type which contains Note embedded documents
 * @see {@link applications.NoteConfig}       The Note configuration application
 */
export default class NoteDocument<TParent extends Scene | null> extends CanvasBaseNote<TParent> {
    /** The associated JournalEntry which is referenced by this Note */
    get entry(): JournalEntry;

    /** The specific JournalEntryPage within the associated JournalEntry referenced by this Note. */
    get page(): JournalEntryPage<JournalEntry>;

    /** The text label used to annotate this Note */
    get label(): string;
}

export default interface NoteDocument<TParent extends Scene | null> extends CanvasBaseNote<TParent> {
    readonly _object: Note<this> | null;
}
