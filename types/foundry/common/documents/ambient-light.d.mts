import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The AmbientLight Document.
 * Defines the DataSchema and common behaviors for an AmbientLight which are shared between both client and server.
 * @category Documents
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
    _id: fields.DocumentIdField;
    name: fields.StringField;
    x: fields.NumberField<number, number, true, false, true>;
    y: fields.NumberField<number, number, true, false, true>;
    elevation: fields.NumberField<number, number, true, false, true>;
    levels: fields.SceneLevelsSetField;
    rotation: fields.AngleField;
    walls: fields.BooleanField;
    vision: fields.BooleanField;
    config: fields.EmbeddedDataField<data.LightData<BaseAmbientLight<BaseScene | null>>>;
    hidden: fields.BooleanField;
    locked: fields.BooleanField;
    flags: fields.DocumentFlagsField;
};

export type AmbientLightSource = fields.SourceFromSchema<AmbientLightSchema>;
