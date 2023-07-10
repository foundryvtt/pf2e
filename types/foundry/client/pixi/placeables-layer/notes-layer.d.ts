declare class NotesLayer<TNote extends Note = Note> extends PlaceablesLayer<TNote> {
    override quadtree: CanvasQuadtree<TNote>;
}
