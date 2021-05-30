declare module foundry {
    module documents {
        /**The AmbientLight embedded document model. */
        class BaseAmbientLight extends abstract.Document {
            static get schema(): typeof data.AmbientLightData;

            static get metadata(): AmbientLightMetadata;

            protected _initialize(): void;
        }

        interface BaseAmbientLight {
            readonly data: data.AmbientLightData<this>;

            readonly parent: BaseScene | null;
        }

        interface AmbientLightMetadata extends abstract.DocumentMetadata {
            name: 'AmbientLight';
            collection: 'lights';
            label: 'DOCUMENT.AmbientLight';
            isEmbedded: true;
        }
    }
}
