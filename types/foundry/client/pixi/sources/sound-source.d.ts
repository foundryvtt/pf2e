export {};

declare global {
    /**
     * A specialized subclass of the PointSource abstraction which is used to control the rendering of sound sources.
     * @param object The AmbientSound object that generates this sound source
     */
    class SoundSource<TObject extends PlaceableObject> extends PointSource<TObject> {
        static sourceType: "sound";

        protected override _getPolygonConfiguration(): PointSourcePolygonConfig;
    }
}
