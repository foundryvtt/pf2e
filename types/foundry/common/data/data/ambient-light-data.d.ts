declare module foundry {
    module data {
        /**
         * The data schema for a AmbientLight embedded document.
         *
         * @property _id                   The _id which uniquely identifies this BaseAmbientLight embedded document
         * @property [t=l]                 The source type in CONST.SOURCE_TYPES which defines the behavior of this light
         * @property [x=0]                 The x-coordinate position of the origin of the light
         * @property [y=0]                 The y-coordinate position of the origin of the light
         * @property [rotation=0]          The angle of rotation for the tile between 0 and 360
         * @property [dim=0]               The radius of dim light emitted in distance units, negative values produce darkness
         * @property [bright=0]            The radius of bright light emitted in distance units, negative values produce blackness
         * @property [angle=360]           The angle of emission of the light source in degrees
         * @property [tintColor]           An optional color string which applies coloration to the resulting light source
         * @property [tintAlpha=0.5]       The intensity of coloration applied to this light source, a number between 0 and 1
         * @property [lightAnimation]      A data object which configures token light animation settings, if one is applied
         * @property [darknessThreshold=0] A value of the Scene darkness level, above which this light source will be active
         * @property [hidden=false]        Is the light source currently hidden?
         * @property [flags={}]            An object of optional key/value flags
         */
        interface AmbientLightSource {
            _id: string;
            t: string;
            x: number;
            y: number;
            rotation: number;
            dim: number;
            bright: number;
            angle: number;
            tintColor: HexColorString;
            tintAlpha: number;
            lightAnimation: AnimationSource;
            darknessThreshold: number;
            darkness: DarknessActivationSource;
            hidden: boolean;
            flags: Record<string, unknown>;
        }

        class AmbientLightData<
            TDocument extends documents.BaseAmbientLight = documents.BaseAmbientLight,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            lightAnimation: AnimationData<documents.BaseAmbientLight>;

            darkness: DarknessActivation;
        }

        interface AmbientLightData extends Omit<AmbientLightSource, 'lightAnimation' | 'darknessActivation'> {
            readonly _source: AmbientLightSource;
        }
    }
}

declare type LightSourceType = typeof CONST.SOURCE_TYPES[keyof typeof CONST.SOURCE_TYPES];
