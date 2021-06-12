declare module foundry {
    module documents {
        /**The Tile embedded document model. */
        class BaseTile extends abstract.Document {
            static override get schema(): typeof data.TileData;

            static override get metadata(): TileMetadata;
        }

        interface BaseTile {
            readonly data: data.TileData<this>;

            readonly parent: BaseScene | null;
        }

        interface TileMetadata extends abstract.DocumentMetadata {
            name: 'Tile';
            collection: 'tiles';
            label: 'DOCUMENT.Tile';
            isEmbedded: true;
        }
    }
}
