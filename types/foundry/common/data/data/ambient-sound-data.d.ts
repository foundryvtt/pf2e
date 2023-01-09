declare module foundry {
    module data {
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
            darkness: DarknessActivationSource;
            flags: Record<string, unknown>;
        }

        class AmbientSoundData<
            TDocument extends documents.BaseAmbientSound = documents.BaseAmbientSound
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            darkness: DarknessActivation;
        }

        interface AmbientSoundData extends Omit<AmbientSoundSource, "darkness"> {
            readonly _source: AmbientSoundSource;
        }
    }
}
