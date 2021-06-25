declare module foundry {
    module data {
        /**
         * The data schema for a PlaylistSound embedded document.
         * @see BasePlaylistSound
         *
         * @param data       Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id               The _id which uniquely identifies this PlaylistSound document
         * @property name              The name of this sound track
         * @property path              The audio file path that is played by this sound
         * @property [playing=false]   Is this sound currently playing?
         * @property [repeat=false]    Does this sound loop?
         * @property [volume=0.5]      The audio volume of the sound, from 0 to 1
         * @property [streaming=false] Does this audio file use the "large file streaming" mode?
         * @property [flags={}]        An object of optional key/value flags
         */
        interface PlaylistSoundSource {
            _id: string;
            name: string;
            path: string;
            playing: boolean;
            repeat: boolean;
            volumn: number;
            streaming: boolean;
            flags: Record<string, unknown>;
        }

        class PlaylistSoundData<
            TDocument extends documents.BasePlaylistSound = documents.BasePlaylistSound,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            protected override _initialize(): void;
        }

        interface PlaylistSoundData extends PlaylistSoundSource {
            readonly _source: PlaylistSoundSource;
        }
    }
}
