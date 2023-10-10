import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type * as documents from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

/** The Playlist document model. */
export default class BasePlaylist extends Document<null, PlaylistSchema> {
    static override get metadata(): PlaylistMetadata;

    static override defineSchema(): PlaylistSchema;
}

export default interface BasePlaylist extends Document<null, PlaylistSchema>, ModelPropsFromSchema<PlaylistSchema> {
    get documentName(): PlaylistMetadata["name"];

    readonly sounds: EmbeddedCollection<documents.BasePlaylistSound<this>>;
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
    sounds: fields.EmbeddedCollectionField<documents.BasePlaylistSound<documents.BasePlaylist>>;
    mode: fields.NumberField<PlaylistMode, PlaylistMode, true>;
    playing: fields.BooleanField;
    fade: fields.NumberField;
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    sorting: fields.StringField<PlaylistSortMode, PlaylistSortMode, true, false, true>;
    seed: fields.NumberField;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.ObjectField<DocumentFlags>;
    _stats: fields.DocumentStatsField;
};
