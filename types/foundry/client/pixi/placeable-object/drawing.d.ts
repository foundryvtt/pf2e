declare class Drawing extends PlaceableObject<DrawingDocument> {
    /** @override */
    get layer(): DrawingLayer;

    /** @override */
    static get layer(): DrawingLayer;
}
