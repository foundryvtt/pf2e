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
    /** The _id which uniquely identifies the embedded Wall document */
    _id: fields.DocumentIdField;
    /** The wall coordinates, a length-4 array of finite numbers [x0,y0,x1,y1] */
    c: fields.ArrayField<
        fields.NumberField<number, number, true, false, true>,
        [number, number, number, number],
        [number, number, number, number]
    >;
    /** The level IDs */
    levels: fields.SceneLevelsSetField;
    /** The illumination restriction type of this wall */
    light: fields.NumberField<EdgeSenseType, EdgeSenseType, true, true, true>;
    /** The movement restriction type of this wall */
    move: fields.NumberField<WallMovementType, WallMovementType, true, true, true>;
    /** The visual restriction type of this wall */
    sight: fields.NumberField<EdgeSenseType, EdgeSenseType, true, true, true>;
    /** The auditory restriction type of this wall */
    sound: fields.NumberField<EdgeSenseType, EdgeSenseType, true, true, true>;
    /** The direction of effect imposed by this wall */
    dir: fields.NumberField<EdgeDirection, EdgeDirection, true, true, true>;
    /** The type of door which this wall contains, if any */
    door: fields.NumberField<WallDoorType, WallDoorType, true, true, true>;
    /** The state of the door this wall contains, if any */
    ds: fields.NumberField<WallDoorState, WallDoorState, true, true, true>;
    /** The type of door sound to play, if any */
    doorSound: fields.StringField<string, string, false, false, false>;
    /** Configuration of threshold data for this wall */
    threshold: fields.SchemaField<{
        /** Minimum distance in grid units from a light source for which this wall blocks light and darkness */
        light: fields.NumberField<number, number, true, true, true>;
        /** Minimum distance in grid units from a vision source for which this wall blocks vision */
        sight: fields.NumberField<number, number, true, true, true>;
        /** Minimum distance in grid units from a sound source for which this wall blocks sound */
        sound: fields.NumberField<number, number, true, true, true>;
        /** Whether to attenuate the source radius when passing through the wall */
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
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type WallSource = fields.SourceFromSchema<WallSchema>;
