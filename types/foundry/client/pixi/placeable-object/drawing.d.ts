declare class Drawing extends PlaceableObject<DrawingDocument> {
    /** A reference to the User who created the Drawing document. */
    get author(): User;
}

declare interface Drawing {
    get layer(): DrawingsLayer;
}
