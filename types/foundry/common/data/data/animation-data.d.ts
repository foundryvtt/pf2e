declare module foundry {
    module data {
        /**
         * An embedded data object which defines the properties of a light source animation
         * @property type      The animation type which is applied
         * @property speed     The speed of the animation, a number between 1 and 10
         * @property intensity The intensity of the animation, a number between 1 and 10
         */
        interface AnimationData {
            type: string;
            speed: number;
            intensity: number;
        }
    }
}
