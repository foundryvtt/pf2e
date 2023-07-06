import type { ClientBasePlaylist } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Playlist document which extends the common BasePlaylist model.
     *
     * @see {@link Playlists}             The world-level collection of Playlist documents
     * @see {@link PlaylistSound}         The PlaylistSound embedded document within a parent Playlist
     * @see {@link PlaylistConfig}        The Playlist configuration application
     */
    class Playlist extends ClientBasePlaylist {
        constructor(data: PreCreate<foundry.documents.PlaylistSource>, context?: DocumentConstructionContext<null>);

        /**
         * Each sound which is played within the Playlist has a created Howl instance.
         * The keys of this object are the sound IDs and the values are the Howl instances.
         */
        audio: Record<string, unknown>;

        /** Playlists may have a playback order which defines the sequence of Playlist Sounds */
        protected _playbackOrder: string[];

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** The playback mode for the Playlist instance */
        get mode(): PlaylistMode;

        /**
         * The order in which sounds within this playlist will be played (if sequential or shuffled)
         * Uses a stored seed for randomization to guarantee that all clients generate the same random order.
         */
        get playbackOrder(): string[];

        /** An indicator for whether any Sound within the Playlist is currently playing */
        get playing(): boolean;

        override get visible(): boolean;

        /**
         * Begin simultaneous playback for all sounds in the Playlist.
         * @returns The updated Playlist document
         */
        playAll(): Promise<this>;

        /**
         * Play the next Sound within the sequential or shuffled Playlist.
         * @param [soundId]    The currently playing sound ID, if known
         * @param [options={}] Additional options which configure the next track
         * @param [options.direction=1] Whether to advance forward (if 1) or backwards (if -1)
         * @returns The updated Playlist document
         */
        playNext(soundId: string, { direction }?: { direction?: number }): Promise<this>;

        /**
         * Begin playback of a specific Sound within this Playlist.
         * Determine which other sounds should remain playing, if any.
         * @param sound The desired sound that should play
         * @returns The updated Playlist
         */
        playSound(sound: PlaylistSound<this>): Promise<this>;

        /**
         * Stop playback of a specific Sound within this Playlist.
         * Determine which other sounds should remain playing, if any.
         * @param sound The desired sound that should play
         * @returns The updated Plaaylist
         */
        stopSound(sound: PlaylistSound<this>): Promise<this | undefined>;
        /**
         * End playback for any/all currently playing sounds within the Playlist.
         * @returns The updated Playlist entity
         */
        stopAll(): Promise<this | undefined>;

        /**
         * Cycle the playlist mode
         * @return A promise which resolves to the updated Playlist instance
         */
        cycleMode(): Promise<this | undefined>;

        /** Get the next sound in the cached playback order. For internal use. */
        protected _getNextSound(soundId: string): PlaylistSound<this>;

        /** Get the previous sound in the cached playback order. For internal use. */
        protected _getPreviousSound(soundId: string): PlaylistSound<this>;

        /** Define the sorting order for the Sounds within this Playlist. For internal use. */
        protected _sortSounds(a: PlaylistSound<this>, b: PlaylistSound<this>): number;

        protected override _preUpdate(
            data: DocumentUpdateData<this>,
            options: DocumentModificationContext<null>,
            user: User
        ): Promise<void>;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentModificationContext<null>,
            userId: string
        ): void;

        protected override _onDelete(options: DocumentModificationContext<null>, userId: string): void;

        protected override _onCreateDescendantDocuments(
            embeddedName: "PlaylistSound",
            documents: PlaylistSound<this>[],
            result: PlaylistSound<this>["_source"][],
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        protected override _onUpdateDescendantDocuments(
            embeddedName: "PlaylistSound",
            documents: PlaylistSound<this>[],
            result: PlaylistSound<this>["_source"][],
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        protected override _onDeleteDescendantDocuments(
            embeddedName: "PlaylistSound",
            documents: PlaylistSound<this>[],
            result: string[],
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        /** Handle callback logic when an individual sound within the Playlist concludes playback naturally */
        protected _onSoundEnd(sound: PlaylistSound<this>): Promise<this | undefined>;

        /**
         * Handle callback logic when playback for an individual sound within the Playlist is started.
         * Schedule auto-preload of next track
         */
        protected _onSoundStart(sound: PlaylistSound<this>): Promise<void>;

        override toCompendium(pack: CompendiumCollection<this>): this["_source"];
    }

    interface Playlist extends ClientBasePlaylist {
        readonly sounds: foundry.abstract.EmbeddedCollection<PlaylistSound<this>>;
    }
}
