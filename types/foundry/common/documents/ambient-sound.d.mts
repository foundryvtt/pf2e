import { AudioFilePath } from "@common/constants.mjs";
import { Document, DocumentMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The Document definition for an AmbientSound.
 * Defines the DataSchema and common behaviors for an AmbientSound which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the AmbientSound
 * @param context Construction context options
 */
export default class BaseAmbientSound<TParent extends BaseScene | null> extends Document<TParent, AmbientSoundSchema> {
    static override get metadata(): AmbientSoundMetadata;

    static defineSchema(): AmbientSoundSchema;
}

export default interface BaseAmbientSound<TParent extends BaseScene | null>
    extends Document<TParent, AmbientSoundSchema>,
        fields.ModelPropsFromSchema<AmbientSoundSchema> {
    get documentName(): AmbientSoundMetadata["name"];
}

interface AmbientSoundMetadata extends DocumentMetadata {
    name: "AmbientSound";
    collection: "sounds";
    label: "DOCUMENT.AmbientSound";
    labelPlural: "DOCUMENT.AmbientSounds";
    isEmbedded: true;
}

/**
 * @typedef {Object} AmbientSoundData

 * @property {{min: number, max: number}} darkness  A darkness range (min and max) for which the source should be active
 * @property {object} [flags]             An object of optional key/value flags
 */
type AmbientSoundSchema = {
    /** The _id which uniquely identifies this AmbientSound document */
    _id: fields.DocumentIdField;
    /** The x-coordinate position of the origin of the sound. */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the origin of the sound. */
    y: fields.NumberField<number, number, true, false, true>;
    /** The radius of the emitted sound. */
    radius: fields.NumberField<number, number, true, false, true>;
    /** The audio file path that is played by this sound */
    path: fields.FilePathField<AudioFilePath>;
    /** Does this sound loop? */
    repeat: fields.BooleanField;
    /** The audio volume of the sound, from 0 to 1 */
    volume: fields.AlphaField;
    /** Whether or not this sound source is constrained by Walls. */
    walls: fields.BooleanField;
    /**
     * Whether to adjust the volume of the sound heard by the listener based on how close the listener is to the center
     * of the sound source.
     */
    easing: fields.BooleanField;
    /** Is the sound source currently hidden? */
    hidden: fields.BooleanField;
    /** A darkness range (min and max) for which the source should be active */
    darkness: fields.SchemaField<{
        min: fields.AlphaField;
        max: fields.AlphaField;
    }>;
    /** A darkness range (min and max) for which the source should be active */
    flags: fields.DocumentFlagsField;
};

export type AmbientSoundSource = fields.SourceFromSchema<AmbientSoundSchema>;
