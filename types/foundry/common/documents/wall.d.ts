import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import type { BaseScene } from "./module.d.ts";

/**
 * The Document definition for a Wall.
 * Defines the DataSchema and common behaviors for a Wall which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Wall
 * @param context Construction context options
 */
export default class BaseWall<TParent extends BaseScene | null> extends Document<TParent, WallSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): WallMetadata;

    static override defineSchema(): WallSchema;
}

export default interface BaseWall<TParent extends BaseScene | null>
    extends Document<TParent, WallSchema>,
        ModelPropsFromSchema<WallSchema> {
    get documentName(): WallMetadata["name"];
}

interface WallMetadata extends DocumentMetadata {
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
    /** The illumination restriction type of this wall */
    light: fields.NumberField<WallSenseType, WallSenseType, true, true, true>;
    /** The movement restriction type of this wall */
    move: fields.NumberField<WallMovementType, WallMovementType, true, true, true>;
    /** The visual restriction type of this wall */
    sight: fields.NumberField<WallSenseType, WallSenseType, true, true, true>;
    /** The auditory restriction type of this wall */
    sound: fields.NumberField<WallSenseType, WallSenseType, true, true, true>;
    /** The direction of effect imposed by this wall */
    dir: fields.NumberField<WallDirection, WallDirection, true, true, true>;
    /** The type of door which this wall contains, if any */
    door: fields.NumberField<WallDoorType, WallDoorType, true, true, true>;
    /** The state of the door this wall contains, if any */
    ds: fields.NumberField<WallDoorState, WallDoorState, true, true, true>;
    doorSound: fields.StringField<string, string, false, false, false>;
    /** Configuration of threshold data for this wall */
    threshold: fields.SchemaField<WallThresholdSchema>;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

type WallThresholdSchema = {
    /** Minimum distance from a light source for which this wall blocks light */
    light: fields.NumberField<number, number, true, true, true>;
    /** Minimum distance from a vision source for which this wall blocks vision */
    sight: fields.NumberField<number, number, true, true, true>;
    /** Minimum distance from a sound source for which this wall blocks sound */
    sound: fields.NumberField<number, number, true, true, true>;
    /** Whether to attenuate the source radius when passing through the wall */
    attenuation: fields.BooleanField;
};

type WallSource = SourceFromSchema<WallSchema>;
