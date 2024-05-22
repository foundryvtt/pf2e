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
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Playlists may have a playback order which defines the sequence of Playlist Sounds */
        protected _playbackOrder: string[];

        /**
         * The order in which sounds within this playlist will be played (if sequential or shuffled)
         * Uses a stored seed for randomization to guarantee that all clients generate the same random order.
         */
        get playbackOrder(): string[];

        override get visible(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Find all content links belonging to a given {@link Playlist} or {@link PlaylistSound}.
         * @param doc  The Playlist or PlaylistSound.
         */
        protected static _getSoundContentLinks(doc: Playlist | PlaylistSound<Playlist | null>): NodeListOf<Element>;

        override prepareDerivedData(): void;

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
            data: Record<string, unknown>,
            options: DatabaseUpdateOperation<null>,
            user: User,
        ): Promise<void>;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<null>,
            userId: string,
        ): void;

        protected override _onDelete(options: DatabaseDeleteOperation<null>, userId: string): void;

        protected override _onCreateDescendantDocuments(
            parent: this,
            collection: "sounds",
            documents: PlaylistSound<this>[],
            data: PlaylistSound<this>["_source"][],
            options: DatabaseCreateOperation<this>,
            userId: string,
        ): void;

        protected override _onUpdateDescendantDocuments(
            parent: this,
            collection: "sounds",
            documents: PlaylistSound<this>[],
            changes: DeepPartial<PlaylistSound<this>["_source"]>[],
            options: DatabaseUpdateOperation<this>,
            userId: string,
        ): void;

        protected override _onDeleteDescendantDocuments(
            parent: this,
            collection: "sounds",
            documents: PlaylistSound<this>[],
            ids: string[],
            options: DatabaseDeleteOperation<this>,
            userId: string,
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
