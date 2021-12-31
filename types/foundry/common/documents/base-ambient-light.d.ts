declare module foundry {
    module documents {
        /** The AmbientLight embedded document model. */
        class BaseAmbientLight extends abstract.Document {
            static override get schema(): typeof data.AmbientLightData;

            static override get metadata(): AmbientLightMetadata;

            protected override _initialize(): void;
        }

        interface BaseAmbientLight {
            readonly data: data.AmbientLightData<BaseAmbientLight>;

            readonly parent: BaseScene | null;
        }

        interface AmbientLightMetadata extends abstract.DocumentMetadata {
            name: "AmbientLight";
            collection: "lights";
            label: "DOCUMENT.AmbientLight";
            isEmbedded: true;
        }
    }
}
