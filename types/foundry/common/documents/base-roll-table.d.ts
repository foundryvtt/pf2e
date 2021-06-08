declare module foundry {
    module documents {
        /**
         * The RollTable document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseRollTable extends abstract.Document {
            static override get schema(): typeof data.RollTableData;

            static override get metadata(): RollTableMetadata;

            /** A reference to the Collection of TableResult instances in this document, indexed by _id. */
            get results(): this['data']['results'];
        }

        interface BaseRollTable {
            readonly data: data.RollTableData<this>;

            readonly parent: null;
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
