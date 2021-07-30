declare class Note extends PlaceableObject<NoteDocument> {
    /** @todo fill in ... some day */
}

declare interface Note extends PlaceableObject<NoteDocument> {
    get layer(): NotesLayer<this>;
}
