declare module foundry {
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
        interface LightSource {
            _id: string;
            alpha: number;
            animation: object;
            angle: number;
            bright: number;
            color: string;
            coloration: number;
            contrast: number;
            darkness: { min: number; max: number };
            dim: number;
            invertColor: boolean;
            gradual: boolean;
            luminosity: number;
            saturation: number;
            shadows: number;
        }

        class LightData<
            TDocument extends documents.BaseAmbientLight | documents.BaseToken =
                | documents.BaseAmbientLight
                | documents.BaseToken
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            /** A reusable field definition for uniform fields used by LightData */
            static LIGHT_UNIFORM_FIELD: {
                type: typeof Number;
                required: true;
                default: number;
                validate: (n: unknown) => boolean;
                validationError: string;
            };

            protected override _initializeSource(data: object): this["_source"];

            protected override _initialize(): void;
        }

        interface LightData extends LightSource {
            readonly _source: LightSource;
        }
    }
}
