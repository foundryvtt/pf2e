declare module foundry {
    module data {
        /**
         * An embedded data object which defines the darkness range during which some attribute is active
         * @property [min=0] The minimum darkness level for which activation occurs
         * @property [max=1] The maximum darkness level for which activation occurs
         */
        interface DarknessActivation {
            min: number;
            max: number;
        }
    }
}
