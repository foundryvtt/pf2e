import { DataModel } from "../../abstract/data.mjs";
import {
    AlphaField,
    AngleField,
    BooleanField,
    ColorField,
    ModelPropsFromSchema,
    NumberField,
    SchemaField,
    StringField,
} from "../fields.mjs";

declare global {
    module foundry {
        module data {
            /**
             * A reusable document structure for the internal data used to render the appearance of a light source.
             * This is re-used by both the AmbientLightData and TokenData classes.
             *
             * @property alpha       An opacity for the emitted light, if any
             * @property animation   An animation configuration for the source
             * @property angle       The angle of emission for this point source
             * @property bright      The allowed radius of bright vision or illumination
             * @property color       A tint color for the emitted light, if any
             * @property coloration  The coloration technique applied in the shader
             * @property contrast    The amount of contrast this light applies to the background texture
             * @property darkness    A darkness range (min and max) for which the source should be active
             * @property dim         The allowed radius of dim vision or illumination
             * @property invertColor Does this source invert the color of the background texture?
             * @property gradual     Fade the difference between bright, dim, and dark gradually?
             * @property luminosity  The luminosity applied in the shader
             * @property saturation  The amount of color saturation this light applies to the background texture
             * @property shadows     The depth of shadows this light applies to the background texture
             */
            class LightData extends DataModel<DataModel | null, LightDataSchema> {
                static override defineSchema(): LightDataSchema;

                static override migrateData<TSource extends object>(source: TSource): TSource;
            }

            interface LightData
                extends DataModel<DataModel | null, LightDataSchema>,
                    ModelPropsFromSchema<LightDataSchema> {}

            type LightSource = SourceFromSchema<LightDataSchema>;
        }
    }
}

type LightDataSchema = {
    alpha: AlphaField;
    angle: AngleField;
    bright: NumberField<number, number, true, false, true>;
    color: ColorField;
    coloration: NumberField<number, number, true>;
    dim: NumberField<number, number, true>;
    attenuation: NumberField<number, number, true>;
    luminosity: NumberField<number, number, true, false, true>;
    saturation: NumberField<number, number, true, false, true>;
    constrast: NumberField<number, number, true, false, true>;
    shadows: NumberField<number, number, true, false, true>;
    animation: SchemaField<{
        type: StringField<string, string, true, true, true>;
        speed: NumberField<number, number, true>;
        intensity: NumberField<number, number, true>;
        reverse: BooleanField;
    }>;
    darkness: SchemaField<{
        min: AlphaField;
        speed: AlphaField;
    }>;
};
