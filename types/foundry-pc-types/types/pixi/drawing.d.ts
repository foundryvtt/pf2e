declare class Drawing extends PlaceableObject {
    /** @override */
    get layer(): DrawingLayer;

    /** @override */
    static get layer(): DrawingLayer;
}