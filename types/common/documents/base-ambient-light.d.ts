declare module foundry {
    module documents {
        /**The AmbientLight embedded document model. */
        class BaseAmbientLight extends abstract.Document {
            /** @override */
            static get schema(): typeof data.AmbientLightData;

            /** @override */
            static get metadata(): AmbientLightMetadata;

            /** @override */
            _initialize(): void;
        }

        interface BaseAmbientLight {
            readonly data: data.AmbientLightData<BaseAmbientLight>;
        }

        interface AmbientLightMetadata extends abstract.DocumentMetadata {
            name: 'AmbientLight';
            collection: 'lights';
            label: 'DOCUMENT.AmbientLight';
            isEmbedded: true;
        }
    }
}
