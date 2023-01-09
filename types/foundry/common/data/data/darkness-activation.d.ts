declare module foundry {
    module data {
        /**
         * An embedded data object which defines the darkness range during which some attribute is active
         * @property [min=0] The minimum darkness level for which activation occurs
         * @property [max=1] The maximum darkness level for which activation occurs
         */
        interface DarknessActivationSource {
            min: number;
            max: number;
        }

        class DarknessActivation extends abstract.DocumentData<
            documents.BaseAmbientLight | documents.BaseAmbientSound
        > {}

        interface DarknessActivation extends DarknessActivationSource {
            readonly _source: DarknessActivationSource;

            readonly parent: null;
        }
    }
}
