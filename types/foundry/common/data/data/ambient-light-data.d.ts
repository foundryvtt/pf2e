declare module foundry {
    module data {
        /**
         * The data schema for a AmbientLight embedded document.
         *
         * @property _id            The _id which uniquely identifies this BaseAmbientLight embedded document
         * @property [x=0]          The x-coordinate position of the origin of the light
         * @property [y=0]          The y-coordinate position of the origin of the light
         * @property [rotation=0]   The angle of rotation for the tile between 0 and 360
         * @property [walls=true]   Whether or not this light source is constrained by Walls
         * @property [vision=false] Whether or not this light source provides a source of vision
         * @property config         Light configuration data
         * @property [hidden=false] Is the light source currently hidden?
         * @property [flags={}]     An object of optional key/value flags
         */
        interface AmbientLightSource {
            _id: string;
            t: string;
            x: number;
            y: number;
            rotation: number;
            walls: boolean;
            vision: boolean;
            config: LightSource;
            hidden: boolean;
            flags: Record<string, unknown>;
        }

        class AmbientLightData<
            TDocument extends documents.BaseAmbientLight = documents.BaseAmbientLight
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            lightAnimation: AnimationData<documents.BaseAmbientLight>;

            darkness: DarknessActivation;
        }

        interface AmbientLightData extends Omit<AmbientLightSource, "config"> {
            readonly _source: AmbientLightSource;

            config: LightData<NonNullable<this["document"]>>;
        }
    }
}

declare type LightSourceType = typeof CONST.SOURCE_TYPES[keyof typeof CONST.SOURCE_TYPES];
