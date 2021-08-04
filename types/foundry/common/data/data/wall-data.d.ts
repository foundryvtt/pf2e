declare module foundry {
    module data {
        interface WallSource extends abstract.DocumentSource {
            c: number[];
            move?: number;
            sense?: number;
            dir?: number;
            door?: number;
            ds?: number;
        }

        /**
         * The data schema for a Wall document.
         * @see BaseWall
         *
         * @param data Initial data used to construct the data object
         * @param [document]   The embedded document to which this data object belongs
         *
         * @property _id       The _id which uniquely identifies the embedded Wall document
         * @property c         The wall coordinates, a length-4 array of finite numbers [x0,y0,x1,y1]
         * @property [move=0]  The movement restriction type of this wall
         * @property [sense=0] The sensory restriction type of this wall
         * @property [dir=0]   The direction of effect imposed by this wall
         * @property [door=0]  The type of door which this wall contains, if any
         * @property [ds=0]    The state of the door this wall contains, if any
         */
        class WallData<
            TDocument extends documents.BaseWall = documents.BaseWall
        > extends abstract.DocumentData<TDocument> {
            /** The data schema for a WallData object */
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface WallData extends WallSource {
            readonly _source: WallSource;
        }
    }
}
