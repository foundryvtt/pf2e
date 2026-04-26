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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    description: fields.StringField;
    path: fields.FilePathField<AudioFilePath>;
    playing: fields.BooleanField;
    pausedTime: fields.NumberField;
    repeat: fields.BooleanField;
    volume: fields.AlphaField;
    fade: fields.NumberField;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
};

export type PlaylistSoundSource = fields.SourceFromSchema<PlaylistSoundSchema>;
