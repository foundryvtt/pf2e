import { PlaylistMode, PlaylistSortMode } from "@common/constants.mjs";
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
    /** The name of this playlist */
    name: fields.StringField<string, string, true, false, false>;
    /** The description of this playlist */
    description: fields.StringField;
    /** A Collection of PlaylistSounds embedded documents which belong to this playlist */
    sounds: fields.EmbeddedCollectionField<BasePlaylistSound<BasePlaylist>>;
    /** A channel in CONST.AUDIO_CHANNELS where all sounds in this playlist are played */
    channel: fields.StringField<string, string, true>;
    /** The playback mode for sounds in this playlist */
    mode: fields.NumberField<PlaylistMode, PlaylistMode, true, false, true>;
    /** Is this playlist currently playing? */
    playing: fields.BooleanField;
    /** A duration in milliseconds to fade volume transition */
    fade: fields.NumberField;
    /** The _id of a Folder which contains this playlist */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The sorting mode used for this playlist. */
    sorting: fields.StringField<PlaylistSortMode, PlaylistSortMode, true, false, true>;
    /** A seed used for playlist randomization to guarantee that all clients generate the same random order. */
    seed: fields.NumberField;
    /** The numeric sort value which orders this playlist relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this Playlist */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type PlaylistSource = fields.SourceFromSchema<PlaylistSchema>;
