import { TileOcclusionMode } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import { TextureData } from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseScene } from "./_module.mjs";

/**
 * The TableResult Document.
 * Defines the DataSchema and common behaviors for a TableResult which are shared between both client and server.
 * @category Documents
 */
export default class BaseTile<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    TileSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): TileMetadata;

    static override defineSchema(): TileSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /* -------------------------------------------- */
    /*  Document Methods                            */
    /* -------------------------------------------- */

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseTile<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, TileSchema>, fields.ModelPropsFromSchema<TileSchema> {
    get documentName(): TileMetadata["name"];
}

interface TileMetadata extends DocumentClassMetadata {
    name: "Tile";
    collection: "tiles";
    label: "DOCUMENT.Tile";
    labelPlural: "DOCUMENT.Tiles";
}

type TileSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField;
    texture: TextureData;
    width: fields.NumberField<number, number, true, false, true>;
    height: fields.NumberField<number, number, true, false, true>;
    x: fields.NumberField<number, number, true, false, true>;
    y: fields.NumberField<number, number, true, false, true>;
    elevation: fields.NumberField<number, number, true, false, true>;
    levels: fields.SceneLevelsSetField;
    rotation: fields.AngleField;
    alpha: fields.AlphaField;
    hidden: fields.BooleanField;
    locked: fields.BooleanField;
    restrictions: fields.SchemaField<{
        light: fields.BooleanField;
        weather: fields.BooleanField;
    }>;
    occlusion: fields.SchemaField<{
        modes: fields.SetField<fields.NumberField<TileOcclusionMode, TileOcclusionMode, false, false, false>>;
        alpha: fields.AlphaField;
    }>;
    video: fields.SchemaField<{
        loop: fields.BooleanField;
        autoplay: fields.BooleanField;
        volume: fields.AlphaField;
    }>;
    flags: fields.DocumentFlagsField;
};

export type TileSource = fields.SourceFromSchema<TileSchema>;
