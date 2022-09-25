declare module foundry {
    module documents {
        /** The AmbientSound embedded document model. */
        class BaseAmbientSound extends abstract.Document {
            static override get schema(): typeof data.AmbientSoundData;

            static override get metadata(): AmbientSoundMetadata;
        }

        interface BaseAmbientSound {
            readonly data: data.AmbientSoundData<this>;

            readonly parent: BaseScene | null;
        }

        interface AmbientSoundMetadata extends abstract.DocumentMetadata {
            name: "AmbientSound";
            collection: "sounds";
            label: "DOCUMENT.AmbientSound";
            isEmbedded: true;
            types: ["l", "g"];
        }
    }
}
