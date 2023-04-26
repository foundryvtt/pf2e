import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BasePlaylist, BaseUser } from "./module.d.ts";

/** The PlaylistSound document model. */
export default class BasePlaylistSound<TParent extends BasePlaylist | null> extends Document<TParent> {
    static override get metadata(): PlaylistSoundMetadata;

    testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;
}

export default interface BasePlaylistSound<TParent extends BasePlaylist | null> extends Document<TParent> {
    readonly _source: PlaylistSoundSource;
}

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

interface PlaylistSoundMetadata extends DocumentMetadata {
    name: "PlaylistSound";
    collection: "sounds";
    label: "DOCUMENT.PlaylistSound";
    isEmbedded: true;
}
