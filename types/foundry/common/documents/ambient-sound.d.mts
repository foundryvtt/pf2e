import { AudioFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The AmbientSound Document.
 * Defines the DataSchema and common behaviors for an AmbientSound which are shared between both client and server.
 * @category Documents
 */
export default class BaseAmbientSound<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    AmbientSoundSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<AmbientSoundMetadata>;

    static defineSchema(): AmbientSoundSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /* -------------------------------------------- */
    /*  Document Methods                            */
    /* -------------------------------------------- */

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseAmbientSound<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, AmbientSoundSchema>, fields.ModelPropsFromSchema<AmbientSoundSchema> {
    get documentName(): AmbientSoundMetadata["name"];
}

interface AmbientSoundMetadata extends DocumentClassMetadata {
    name: "AmbientSound";
    collection: "sounds";
    label: "DOCUMENT.AmbientSound";
    labelPlural: "DOCUMENT.AmbientSounds";
    isEmbedded: true;
}

type OneToTen = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type AmbientSoundSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField;
    x: fields.NumberField<number, number, true, false, true>;
    y: fields.NumberField<number, number, true, false, true>;
    elevation: fields.NumberField<number, number, true, false, true>;
    levels: fields.SceneLevelsSetField;
    radius: fields.NumberField<number, number, true, false, true>;
    path: fields.FilePathField<AudioFilePath>;
    repeat: fields.BooleanField;
    volume: fields.AlphaField;
    walls: fields.BooleanField;
    easing: fields.BooleanField;
    hidden: fields.BooleanField;
    locked: fields.BooleanField;
    darkness: fields.SchemaField<{
        min: fields.AlphaField;
        max: fields.AlphaField;
    }>;
    effects: fields.SchemaField<{
        base: fields.SchemaField<{
            type: fields.StringField;
            intensity: fields.NumberField<OneToTen, OneToTen, true, false, true>;
        }>;
        muffled: fields.SchemaField<{
            type: fields.StringField;
            intensity: fields.NumberField<OneToTen, OneToTen, true, false, true>;
        }>;
    }>;
    flags: fields.DocumentFlagsField;
};

export type AmbientSoundSource = fields.SourceFromSchema<AmbientSoundSchema>;
