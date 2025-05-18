import AbstractBaseShader from "@client/canvas/rendering/shaders/base-shader.mjs";
import DataModel from "@common/abstract/data.mjs";
import * as fields from "@common/data/fields.mjs";
import { ShaderField } from "../../perception/vision-mode.mjs";

/**
 * The turn marker animation data.
 */
interface TurnMarkerAnimationData {
    /** The ID of the animation. */
    id: string;
    /** The label for the animation. */
    label: string;
    /** The configuration of the animation. */
    config?: TurnMarkerAnimationConfigData;
}

/**
 * The turn marker config data.
 */
export interface TurnMarkerAnimationConfigData {
    /** The spin speed for the animation. */
    spin?: number;
    /** The pulse settings. */
    pulse: { speed?: number; min?: number; max?: number };

    /** A shader class to apply or null. */
    shader?: typeof AbstractBaseShader | null;
}

/**
 * Turn marker configuration data model.
 */
export default class TurnMarkerData extends DataModel<null, TurnMarkerDataSchema> {
    static override defineSchema(): TurnMarkerDataSchema;
}

export default interface TurnMarkerData
    extends DataModel<null, TurnMarkerDataSchema>,
        fields.ModelPropsFromSchema<TurnMarkerDataSchema> {}

type TurnMarkerDataSchema = {
    id: fields.StringField;
    label: fields.StringField;
    config: fields.SchemaField<{
        shader: ShaderField;
        spin: fields.NumberField<number, number, true, false, true>;
        pulse: fields.SchemaField<{
            speed: fields.NumberField<number, number, true, false, true>;
            min: fields.NumberField<number, number, true, false, true>;
            max: fields.NumberField<number, number, true, false, true>;
        }>;
    }>;
};
