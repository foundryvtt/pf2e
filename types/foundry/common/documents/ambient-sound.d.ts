declare module foundry {
    module documents {
        /** The AmbientSound embedded document model. */
        class BaseAmbientSound<TParent extends BaseScene | null> extends abstract.Document<TParent> {
            static override get metadata(): AmbientSoundMetadata;
        }

        interface BaseAmbientSound<TParent extends BaseScene | null> extends abstract.Document<TParent> {
            readonly _source: AmbientSoundSource;
        }

        interface AmbientSoundMetadata extends abstract.DocumentMetadata {
            name: "AmbientSound";
            collection: "sounds";
            label: "DOCUMENT.AmbientSound";
            isEmbedded: true;
            types: ["l", "g"];
        }

        /**
         * The data schema for a AmbientSound embedded document.
         * @see BaseAmbientSound
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id             The _id which uniquely identifies this AmbientSound document
         * @property path            The audio file path that is played by this sound
         * @property [playing=false] Is this sound currently playing?
         * @property [repeat=false]  Does this sound loop?
         * @property [volume=0.5]    The audio volume of the sound, from 0 to 1
         * @property [flags={}]      An object of optional key/value flags
         */
        interface AmbientSoundSource {
            _id: string;
            type: string;
            x: number;
            y: number;
            radius: number;
            path: AudioFilePath;
            repeat: boolean;
            volume: number;
            easing: boolean;
            hidden: boolean;
            darkness: data.DarknessActivation;
            flags: DocumentFlags;
        }
    }
}
