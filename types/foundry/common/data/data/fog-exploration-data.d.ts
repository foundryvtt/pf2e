declare module foundry {
    module data {
        /**
         * The data schema for a FogExploration document.
         * @property _id       The _id which uniquely identifies this FogExploration document
         * @property scene     The _id of the Scene document to which this fog applies
         * @property user      The _id of the User document to which this fog applies
         * @property explored  The base64 png image of the explored fog polygon
         * @property positions The object of scene positions which have been explored at a certain vision radius
         * @property timestamp The timestamp at which this fog exploration was last updated
         */
        interface FogExplorationSource {
            _id: string;
            scene: string;
            user: string;
            explored: string;
            position: unknown;
            timestamp: number;
        }

        class FogExplorationData<
            TDocument extends documents.BaseFogExploration = documents.BaseFogExploration
        > extends abstract.DocumentData<TDocument> {}

        interface FogExplorationData extends FogExplorationSource {
            readonly _source: FogExplorationSource;
        }
    }
}
