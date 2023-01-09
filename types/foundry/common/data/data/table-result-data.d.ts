declare module foundry {
    module data {
        /**
         * The data schema for a TableResult embedded document within a Roll Table.
         * @see BaseTableResult
         *
         * @param data       Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property [type=p]      A result sub-type from CONST.TABLE_RESULT_TYPES
         * @property [text]        The text which describes the table result
         * @property [img]         An image file url that represents the table result
         * @property [collection]  A named collection from which this result is drawn
         * @property [resultId]    The _id of a Document within the collection this result references
         * @property [weight=1]    The probabilistic weight of this result relative to other results
         * @property [range]       A length 2 array of ascending integers which defines the range of dice roll
         *                         totals which produce this drawn result
         * @property [drawn=false] Has this result already been drawn (without replacement)
         */
        interface TableResultSource {
            type: TableResultType;
            text: string;
            img: ImageFilePath;
            collection: string;
            resultId: string;
            weight: number;
            range: [number, number];
            drawn: boolean;
        }

        class TableResultData<
            TDocument extends documents.BaseTableResult = documents.BaseTableResult
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface TableResultData extends TableResultSource {
            readonly _source: TableResultSource;
        }
    }
}
