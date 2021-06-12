declare module foundry {
    module data {
        /**
         * An embedded data object which defines the properties of a light source animation
         * @property type      The animation type which is applied
         * @property speed     The speed of the animation, a number between 1 and 10
         * @property intensity The intensity of the animation, a number between 1 and 10
         */
        interface AnimationSource {
            type: string;
            speed: number;
            intensity: number;
        }

        class AnimationData<
            TDocument extends abstract.Document = abstract.Document,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface AnimationData extends AnimationSource {
            readonly _source: AnimationSource;
        }
    }
}
