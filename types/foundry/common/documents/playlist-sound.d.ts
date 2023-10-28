import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type * as documents from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

/** The PlaylistSound document model. */
export default class BasePlaylistSound<TParent extends documents.BasePlaylist | null> extends Document<
    TParent,
    PlaylistSoundSchema
> {
    static override get metadata(): PlaylistSoundMetadata;

    static override defineSchema(): PlaylistSoundSchema;

    testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;
}

export default interface BasePlaylistSound<TParent extends documents.BasePlaylist | null>
    extends Document<TParent, PlaylistSoundSchema>,
        ModelPropsFromSchema<PlaylistSoundSchema> {
    getDocumentName: PlaylistSoundMetadata["name"];
}

type PlaylistSoundSource = SourceFromSchema<PlaylistSoundSchema>;

interface PlaylistSoundMetadata extends DocumentMetadata {
    name: "PlaylistSound";
    collection: "sounds";
    indexed: true;
    label: "DOCUMENT.PlaylistSound";
    labelPlural: "DOCUMENT.PlaylistSounds";
}

type PlaylistSoundSchema = {
    /** The _id which uniquely identifies this PlaylistSound document */
    _id: fields.DocumentIdField;
    /** The name of this sound */
    name: fields.StringField<string, string, true, false, false>;
    /** The description of this sound */
    description: fields.StringField;
    /** The audio file path that is played by this sound */
    path: fields.FilePathField<AudioFilePath>;
    /** Is this sound currently playing? */
    playing: fields.BooleanField;
    /** The time in seconds at which playback was paused */
    pausedTime: fields.NumberField;
    /** Does this sound loop? */
    repeat: fields.BooleanField;
    /** The audio volume of the sound, from 0 to 1 */
    volume: fields.AlphaField;
    /** A duration in milliseconds to fade volume transition */
    fade: fields.NumberField;
    /** The sort order of the PlaylistSound relative to others in the same collection */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};
