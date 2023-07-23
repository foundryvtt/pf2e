import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type { BasePlaylistSound } from "./module.d.ts";
import type { PlaylistSoundSource } from "./playlist-sound.d.ts";

/** The Playlist document model. */
export default class BasePlaylist extends Document<null> {
    static override get metadata(): PlaylistMetadata;

    name: string;

    /** A reference to the Collection of PlaylistSound instances in the Playlist document, indexed by _id. */
    readonly sounds: EmbeddedCollection<BasePlaylistSound<this>>;
}

export default interface BasePlaylist extends Document<null> {
    readonly _source: PlaylistSource;

    get documentName(): (typeof BasePlaylist)["metadata"]["name"];
}

/**
 * The data schema for a Playlist document.
 * @see BasePlaylist
 * @property _id             The _id which uniquely identifies this Playlist document
 * @property name            The name of this playlist
 * @property sounds          A Collection of PlaylistSounds embedded documents which belong to this playlist
 * @property [mode=0]        The playback mode for sounds in this playlist
 * @property [playing=false] Is this playlist currently playing?
 * @property folder          The _id of a Folder which contains this playlist
 * @property [sort]          The numeric sort value which orders this playlist relative to its siblings
 * @property [permission]    An object which configures user permissions to this playlist
 * @property [flags={}]      An object of optional key/value flags
 */
interface PlaylistSource {
    _id: string;
    name: string;
    sounds: PlaylistSoundSource[];
    mode: PlaylistMode;
    playing: boolean;
    fade: number;
    folder: string;
    sort: number;
    seed: number;
    permission: Record<string, DocumentOwnershipLevel>;
    flags: Record<string, unknown>;
}

interface PlaylistMetadata extends DocumentMetadata {
    name: "Playlist";
    collection: "playlists";
    label: "DOCUMENT.Playlist";
    embedded: {
        PlaylistSound: "sounds";
    };
    isPrimary: true;
}
