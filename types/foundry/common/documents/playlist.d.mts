import { PlaylistMode, PlaylistSortMode } from "@common/constants.mjs";
import { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BasePlaylistSound } from "./_module.mjs";

/** The Playlist document model. */
export default class BasePlaylist extends Document<null, PlaylistSchema> {
    static override get metadata(): PlaylistMetadata;

    static override defineSchema(): PlaylistSchema;
}

export default interface BasePlaylist
    extends Document<null, PlaylistSchema>,
        fields.ModelPropsFromSchema<PlaylistSchema> {
    get documentName(): PlaylistMetadata["name"];

    readonly sounds: EmbeddedCollection<any>;
}

interface PlaylistMetadata extends DocumentMetadata {
    name: "Playlist";
    collection: "playlists";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "description", "sort", "folder"];
    embedded: { PlaylistSound: "sounds" };
    label: "DOCUMENT.Playlist";
    labelPlural: "DOCUMENT.Playlists";
}

type PlaylistSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    description: fields.StringField;
    sounds: fields.EmbeddedCollectionField<BasePlaylistSound<BasePlaylist>>;
    mode: fields.NumberField<PlaylistMode, PlaylistMode, true>;
    playing: fields.BooleanField;
    fade: fields.NumberField;
    folder: fields.ForeignDocumentField<BaseFolder>;
    sorting: fields.StringField<PlaylistSortMode, PlaylistSortMode, true, false, true>;
    seed: fields.NumberField;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type PlaylistSource = fields.SourceFromSchema<PlaylistSchema>;

export {};
