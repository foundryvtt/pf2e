export {};

declare global {
    /**
     * A specialized subclass of the PointSource abstraction which is used to control the rendering of sound sources.
     * @param object The AmbientSound object that generates this sound source
     */
    class SoundSource<TObject extends AmbientSound> extends PointSource<TObject> {
        static sourceType: "sound";

        /* -------------------------------------------- */
        /*  Sound Source Attributes                     */
        /* -------------------------------------------- */

        /** The object of data which configures how the source is rendered */
        data: Partial<SoundSourceData>;

        /* -------------------------------------------- */
        /*  Sound Source Initialization                 */
        /* -------------------------------------------- */

        /**
         * Initialize the source with provided object data.
         * @param data Initial data provided to the point source
         * @returns A reference to the initialized source
         */
        initialize(data?: Partial<SoundSourceData>): this;

        protected _getPolygonConfiguration(): PointSourcePolygonConfig;

        /**
         * Process new input data provided to the SoundSource.
         * @param data Initial data provided to the sound source
         */
        protected _initializeData(data: Partial<SoundSourceData>): void;
    }

    interface SoundSourceData {
        /** The x-coordinate of the source location */
        x?: number;
        /** The y-coordinate of the source location */
        y?: number;
        // undocumented
        z?: number;
        /** The radius of the sound effect */
        radius?: number;
        /** Whether or not the source is constrained by walls */
        walls?: boolean;
    }
}
