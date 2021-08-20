declare module foundry {
    module data {
        /**
         * An embedded data object which defines the properties of a light source animation
         * @property mode     The occlusion mode from CONST.TILE_OCCLUSION_MODES
         * @property alpha    The occlusion alpha between 0 and 1
         * @property [radius] An optional radius of occlusion used for RADIAL mode
         */
        interface TileOcclusionSource {
            mode: TileOcclusionMode;
            alpha: number;
            radius?: number;
        }

        /** An inner-object which defines the schema for how Tile occlusion settings are defined */
        class TileOcclusion<
            TDocument extends documents.BaseTile = documents.BaseTile
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface TileOcclusion extends TileOcclusionSource {
            readonly _source: TileOcclusionSource;
        }
    }
}
