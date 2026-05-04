import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The AmbientLight Document.
 * Defines the DataSchema and common behaviors for an AmbientLight which are shared between both client and server.
 */
export default class BaseAmbientLight<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    AmbientLightSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<AmbientLightMetadata>;

    static override defineSchema(): AmbientLightSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /* -------------------------------------------- */
    /*  Document Methods                            */
    /* -------------------------------------------- */

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseAmbientLight<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, AmbientLightSchema>, fields.ModelPropsFromSchema<AmbientLightSchema> {
    get documentName(): AmbientLightMetadata["name"];
}

interface AmbientLightMetadata extends DocumentClassMetadata {
    name: "AmbientLight";
    collection: "lights";
    label: "DOCUMENT.AmbientLight";
    labelPlural: "DOCUMENT.AmbientLights";
}

export type AmbientLightSchema = {
    /** The _id which uniquely identifies this AmbientLight document */
    _id: fields.DocumentIdField;
    /** An optional name. */
    name: fields.StringField;
    /** The x-coordinate position of the origin of the light */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the origin of the light */
    y: fields.NumberField<number, number, true, false, true>;
    /** The elevation */
    elevation: fields.NumberField<number, number, true, false, true>;
    /** The level IDs */
    levels: fields.SceneLevelsSetField;
    /** The angle of rotation for the tile between 0 and 360 */
    rotation: fields.AngleField;
    /** Whether or not this light source is constrained by Walls and surfaces */
    walls: fields.BooleanField;
    /** Whether or not this light source provides a source of vision */
    vision: fields.BooleanField;
    /** Light configuration data */
    config: fields.EmbeddedDataField<data.LightData<BaseAmbientLight<BaseScene | null>>>;
    /** Is the light source currently hidden? */
    hidden: fields.BooleanField;
    /** Is the light source currently locked? */
    locked: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type AmbientLightSource = fields.SourceFromSchema<AmbientLightSchema>;

export {};
