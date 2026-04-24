import {
    EdgeDirection,
    EdgeSenseType,
    ImageFilePath,
    WallDoorState,
    WallDoorType,
    WallMovementType,
} from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The Wall Document.
 * Defines the DataSchema and common behaviors for a Wall which are shared between both client and server.
 * @category Documents
 */
export default class BaseWall<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    WallSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<WallMetadata>;

    static override defineSchema(): WallSchema;

    static LOCALIZATION_PREFIXES: string[];

    /** Colors for each category of wall. */
    static CATEGORY_COLORS: Record<string, Color>;

    /* -------------------------------------------- */
    /*  Document Methods                            */
    /* -------------------------------------------- */

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseWall<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, WallSchema>, fields.ModelPropsFromSchema<WallSchema> {
    get documentName(): WallMetadata["name"];
}

interface WallMetadata extends DocumentClassMetadata {
    name: "Wall";
    collection: "walls";
    label: "DOCUMENT.Wall";
    labelPlural: "DOCUMENT.Walls";
}

type WallSchema = {
    _id: fields.DocumentIdField;
    c: fields.ArrayField<
        fields.NumberField<number, number, true, false, true>,
        [number, number, number, number],
        [number, number, number, number]
    >;
    levels: fields.SceneLevelsSetField;
    light: fields.NumberField<EdgeSenseType, EdgeSenseType, true, true, true>;
    move: fields.NumberField<WallMovementType, WallMovementType, true, true, true>;
    sight: fields.NumberField<EdgeSenseType, EdgeSenseType, true, true, true>;
    sound: fields.NumberField<EdgeSenseType, EdgeSenseType, true, true, true>;
    dir: fields.NumberField<EdgeDirection, EdgeDirection, true, true, true>;
    door: fields.NumberField<WallDoorType, WallDoorType, true, true, true>;
    ds: fields.NumberField<WallDoorState, WallDoorState, true, true, true>;
    doorSound: fields.StringField<string, string, false, false, false>;
    threshold: fields.SchemaField<{
        light: fields.NumberField<number, number, true, true, true>;
        sight: fields.NumberField<number, number, true, true, true>;
        sound: fields.NumberField<number, number, true, true, true>;
        attenuation: fields.BooleanField;
    }>;
    animation: fields.SchemaField<{
        direction: fields.NumberField<-1 | 1, -1 | 1, false, false, true>;
        double: fields.BooleanField;
        duration: fields.NumberField;
        flip: fields.BooleanField;
        strength: fields.NumberField;
        texture: fields.FilePathField<ImageFilePath, ImageFilePath>;
        type: fields.StringField<string, string, true, true, true>;
    }>;
    flags: fields.DocumentFlagsField;
};

export type WallSource = fields.SourceFromSchema<WallSchema>;
