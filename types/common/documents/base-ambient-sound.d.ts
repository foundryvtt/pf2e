declare module foundry {
    module documents {
        /**The AmbientSound embedded document model. */
        class BaseAmbientSound extends abstract.Document {
            /** @override */
            static get schema(): typeof data.AmbientSoundData;

            /** @override */
            static get metadata(): AmbientSoundMetadata;
        }

        interface BaseAmbientSound {
            readonly data: data.AmbientSoundData<BaseAmbientSound>;
        }

        interface AmbientSoundMetadata extends abstract.DocumentMetadata {
            name: 'AmbientSound';
            collection: 'sounds';
            label: 'DOCUMENT.AmbientSound';
            isEmbedded: true;
            types: ['l', 'g'];
        }
    }
}
