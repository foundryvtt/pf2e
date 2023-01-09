declare module foundry {
    module data {
        /**
         * The data schema for a Tile embedded document.
         * @see BaseTile
         *
         * @property _id              The _id which uniquely identifies this Tile embedded document
         * @property [img]            An image or video file path which this tile displays
         * @property [width=0]        The pixel width of the tile
         * @property [height=0]       The pixel height of the tile
         * @property [x=0]            The x-coordinate position of the top-left corner of the tile
         * @property [y=0]            The y-coordinate position of the top-left corner of the tile
         * @property [z=100]          The z-index ordering of this tile relative to its siblings
         * @property [rotation=0]     The angle of rotation for the tile between 0 and 360
         * @property [alpha=1]        The tile opacity
         * @property [tint]           A color to tint the tile
         * @property [hidden=false]   Is the tile currently hidden?
         * @property [locked=false]   Is the tile currently locked?
         * @property [overhead=false] Is the tile an overhead tile?
         * @property [occlusion]      The tile's occlusion settings
         * @property [video]          The tile's video settings
         * @property [flags={}]       An object of optional key/value flags
         */
        interface TileSource {
            _id: string;
            img: ImageFilePath | null;
            width: number;
            height: number;
            x: number;
            y: number;
            z: number;
            rotation: number;
            alpha: number;
            tint: HexColorString | null;
            hidden: boolean;
            locked: boolean;
            overhead: boolean;
            video: VideoSource;
            occlusion: TileOcclusionSource;
            flags: Record<string, unknown>;
        }

        class TileData<
            TDocument extends documents.BaseTile = documents.BaseTile
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface TileData extends TileSource {
            readonly _source: TileSource;

            occlusion: TileOcclusion;

            video: VideoData;
        }
    }
}
