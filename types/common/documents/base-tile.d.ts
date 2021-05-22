declare module foundry {
    module documents {
        /**The Tile embedded document model. */
        class BaseTile extends abstract.Document {
            /** @override */
            static get schema(): typeof data.TileData;

            /** @override */
            static get metadata(): TileMetadata;
        }

        interface BaseTile {
            readonly data: data.TileData<BaseTile>;
        }

        interface TileMetadata extends abstract.DocumentMetadata {
            name: 'Tile';
            collection: 'tiles';
            label: 'DOCUMENT.Tile';
            isEmbedded: true;
        }
    }
}
