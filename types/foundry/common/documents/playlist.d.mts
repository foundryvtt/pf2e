import { AudioChannel, PlaylistMode, PlaylistSortMode } from "@common/constants.mjs";
import { Document, DocumentClassMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BasePlaylistSound } from "./_module.mjs";

/**
 * The Playlist Document.
 * Defines the DataSchema and common behaviors for a Playlist which are shared between both client and server.
 */
export default class BasePlaylist extends Document<null, PlaylistSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<PlaylistMetadata>;

    static override defineSchema(): PlaylistSchema;

    static override LOCALIZATION_PREFIXES: string[];
}

export default interface BasePlaylist
    extends Document<null, PlaylistSchema>, fields.ModelPropsFromSchema<PlaylistSchema> {
    get documentName(): PlaylistMetadata["name"];

    readonly sounds: EmbeddedCollection<BasePlaylistSound<this>>;
}

interface PlaylistMetadata extends DocumentClassMetadata {
    name: "Playlist";
    collection: "playlists";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "description", "sort", "folder"];
    embedded: { PlaylistSound: "sounds" };
    label: "DOCUMENT.Playlist";
    labelPlural: "DOCUMENT.Playlists";
}

type PlaylistSchema = {
    /** The _id which uniquely identifies this Playlist document */
    _id: fields.DocumentIdField;
    /** The name of this Playlist */
    name: fields.StringField<string, string, true, false, false>;
    /** The description of this Playlist */
    description: fields.StringField;
    /** An EmbeddedCollection of PlaylistSound documents */
    sounds: fields.EmbeddedCollectionField<BasePlaylistSound<BasePlaylist>>;
    /** The audio channel this Playlist is played on, CONST.AUDIO_CHANNELS */
    channel: fields.StringField<AudioChannel, AudioChannel, true>;
    /** The mode of this Playlist, CONST.PLAYLIST_MODES */
    mode: fields.NumberField<PlaylistMode, PlaylistMode, true>;
    /** Is this Playlist currently playing? */
    playing: fields.BooleanField;
    /** A duration in milliseconds to fade volume transition */
    fade: fields.NumberField;
    /** The Folder which contains this Playlist */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** How this Playlist is sorted, CONST.PLAYLIST_SORT_MODES */
    sorting: fields.StringField<PlaylistSortMode, PlaylistSortMode, true, false, true>;
    /** A stored seed used for randomization to guarantee that all clients generate the same random order */
    seed: fields.NumberField;
    /** The numeric sort value which orders this Playlist relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this Playlist */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type PlaylistSource = fields.SourceFromSchema<PlaylistSchema>;
