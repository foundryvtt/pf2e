declare class AmbientSound<
    TDocument extends AmbientSoundDocument = AmbientSoundDocument
> extends PlaceableObject<TDocument> {
    protected _draw(): Promise<void>;
}
