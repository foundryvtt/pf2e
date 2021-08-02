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
        > extends abstract.DocumentData<TDocument> {
            static defineSchema(): {
                _id: typeof fields.DOCUMENT_ID;
                scene: fields.ForeignDocumentField<{ type: typeof documents.BaseScene }>;
                user: fields.ForeignDocumentField<{ type: typeof documents.BaseUser }>;
                explored: {
                    type: typeof String;
                    required: true;
                    nullable: true;
                    default: null;
                    validate: typeof validators.isBase64Image;
                    validationError: "The provided FogExploration explored image is not a valid base64 image string";
                };
                positions: typeof fields.OBJECT_FIELD;
                timestamp: typeof fields.TIMESTAMP_FIELD & { required: true };
            };
        }

        interface FogExplorationData extends FogExplorationSource {
            readonly _source: FogExplorationSource;
        }
    }
}
