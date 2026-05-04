import { AudioFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The AmbientSound Document.
 * Defines the DataSchema and common behaviors for an AmbientSound which are shared between both client and server.
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
    /** The _id which uniquely identifies this AmbientSound document */
    _id: fields.DocumentIdField;
    /** An optional name. */
    name: fields.StringField;
    /** The x-coordinate position of the origin of the sound. */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the origin of the sound. */
    y: fields.NumberField<number, number, true, false, true>;
    /** The elevation */
    elevation: fields.NumberField<number, number, true, false, true>;
    /** The level IDs */
    levels: fields.SceneLevelsSetField;
    /** The radius of the emitted sound. */
    radius: fields.NumberField<number, number, true, false, true>;
    /** The audio file path that is played by this sound */
    path: fields.FilePathField<AudioFilePath>;
    /** Does this sound loop? */
    repeat: fields.BooleanField;
    /** The audio volume of the sound, from 0 to 1 */
    volume: fields.AlphaField;
    /** Whether or not this sound source is constrained by Walls and surfaces. True by default. */
    walls: fields.BooleanField;
    /** Whether to adjust the volume of the sound heard by the listener based on how close the listener is to the center of the sound source. True by default. */
    easing: fields.BooleanField;
    /** Is the sound source currently hidden? False by default. */
    hidden: fields.BooleanField;
    /** Is the sound source currently locked? */
    locked: fields.BooleanField;
    /** A darkness range (min and max) for which the source should be active */
    darkness: fields.SchemaField<{
        min: fields.AlphaField;
        max: fields.AlphaField;
    }>;
    /** Special effects to apply to the sound */
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
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type AmbientSoundSource = fields.SourceFromSchema<AmbientSoundSchema>;
