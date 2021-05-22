declare module foundry {
    module documents {
        /**
         * The RollTable document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseRollTable extends abstract.Document {
            /** @override */
            static get schema(): new (...args: any[]) => data.RollTableData;

            /** @override */
            static get metadata(): RollTableMetadata;

            /** A reference to the Collection of TableResult instances in this document, indexed by _id. */
            get results(): this['data']['results'];
        }

        interface BaseRollTable {
            readonly data: data.RollTableData<BaseRollTable>;
        }

        interface RollTableMetadata extends abstract.DocumentMetadata {
            name: 'RollTable';
            collection: 'tables';
            label: 'DOCUMENT.RollTable';
            embedded: {
                TableResult: typeof documents.BaseTableResult;
            };
            isPrimary: true;
        }
    }
}
