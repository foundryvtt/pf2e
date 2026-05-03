import { TileOcclusionMode } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import { TextureData } from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseScene } from "./_module.mjs";

/**
 * The TableResult Document.
 * Defines the DataSchema and common behaviors for a TableResult which are shared between both client and server.
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
    /** The _id which uniquely identifies this Tile document */
    _id: fields.DocumentIdField;
    /** The name of this Tile */
    name: fields.StringField;
    /** An image or video texture which this tile displays. */
    texture: TextureData;
    /** The pixel width of the tile */
    width: fields.NumberField<number, number, true, false, true>;
    /** The pixel height of the tile */
    height: fields.NumberField<number, number, true, false, true>;
    /** The x-coordinate position of the top-left corner of the tile */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the top-left corner of the tile */
    y: fields.NumberField<number, number, true, false, true>;
    /** The elevation that this tile is on */
    elevation: fields.NumberField<number, number, true, false, true>;
    /** An array of Levels that this tile is on */
    levels: fields.SceneLevelsSetField;
    /** The angle of rotation for the tile between 0 and 360 */
    rotation: fields.AngleField;
    /** The tile opacity */
    alpha: fields.AlphaField;
    /** Is the tile currently hidden? */
    hidden: fields.BooleanField;
    /** Is the tile currently locked? */
    locked: fields.BooleanField;
    /** The tile's restriction settings */
    restrictions: fields.SchemaField<{
        light: fields.BooleanField;
        weather: fields.BooleanField;
    }>;
    /** The tile's occlusion settings */
    occlusion: fields.SchemaField<{
        /** The occlusion mode from CONST.TILE_OCCLUSION_MODES */
        modes: fields.SetField<fields.NumberField<TileOcclusionMode, TileOcclusionMode, false, false, false>>;
        /** The occlusion alpha between 0 and 1 */
        alpha: fields.AlphaField;
    }>;
    /** The tile's video settings */
    video: fields.SchemaField<{
        /** Automatically loop the video? */
        loop: fields.BooleanField;
        /** Should the video play automatically? */
        autoplay: fields.BooleanField;
        /** The volume level of any audio that the video file contains */
        volume: fields.AlphaField;
    }>;
    flags: fields.DocumentFlagsField;
};

export type TileSource = fields.SourceFromSchema<TileSchema>;
