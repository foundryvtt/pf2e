import { AudioFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BasePlaylist } from "./_module.mjs";

/**
 * The PlaylistSound Document.
 * Defines the DataSchema and common behaviors for a PlaylistSound which are shared between both client and server.
 */
export default class BasePlaylistSound<TParent extends BasePlaylist | null = BasePlaylist | null> extends Document<
    TParent,
    PlaylistSoundSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<PlaylistSoundMetadata>;

    static override defineSchema(): PlaylistSoundSchema;

    static override LOCALIZATION_PREFIXES: string[];
}

export default interface BasePlaylistSound<TParent extends BasePlaylist | null = BasePlaylist | null>
    extends Document<TParent, PlaylistSoundSchema>, fields.ModelPropsFromSchema<PlaylistSoundSchema> {
    getDocumentName: PlaylistSoundMetadata["name"];
}

interface PlaylistSoundMetadata extends DocumentClassMetadata {
    name: "PlaylistSound";
    collection: "sounds";
    indexed: true;
    label: "DOCUMENT.PlaylistSound";
    labelPlural: "DOCUMENT.PlaylistSounds";
    compendiumIndexFields: ["name", "sort"];
}

type PlaylistSoundSchema = {
    /** The _id which uniquely identifies this PlaylistSound document */
    _id: fields.DocumentIdField;
    /** The name of this PlaylistSound */
    name: fields.StringField<string, string, true, false, false>;
    /** The description of this PlaylistSound */
    description: fields.StringField;
    /** The audio file path that is played by this PlaylistSound */
    path: fields.FilePathField<AudioFilePath>;
    /** IS this PlaylistSound currently playing? */
    playing: fields.BooleanField;
    /** The time in seconds at which playback was paused */
    pausedTime: fields.NumberField;
    /** Does this sound loop? */
    repeat: fields.BooleanField;
    /** The audio volume of the sound, from 0 to 1 */
    volume: fields.AlphaField;
    /** A duration in milliseconds to fade volume transition */
    fade: fields.NumberField;
    /** The numeric sort value which orders this PlaylistSound relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type PlaylistSoundSource = fields.SourceFromSchema<PlaylistSoundSchema>;
