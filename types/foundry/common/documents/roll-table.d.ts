declare module foundry {
    module documents {
        /**
         * The RollTable document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseRollTable extends abstract.Document<null> {
            static override get metadata(): RollTableMetadata;

            /** A reference to the Collection of TableResult instances in this document, indexed by _id. */
            readonly results: abstract.EmbeddedCollection<BaseTableResult<this>>;
        }

        interface BaseRollTable extends abstract.Document<null> {
            readonly _source: RollTableSource;

            get documentName(): (typeof BaseRollTable)["metadata"]["name"];
        }

        /**
         * The data schema for a RollTable document.
         * @see BaseRollTable
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id                The _id which uniquely identifies this RollTable document
         * @property name               The name of this RollTable
         * @property [img]              An image file path which provides the thumbnail artwork for this RollTable
         * @property [description]      The HTML text description for this RollTable document
         * @property [results=[]]       A Collection of TableResult embedded documents which belong to this RollTable
         * @property formula            The Roll formula which determines the results chosen from the table
         * @property [replacement=true] Are results from this table drawn with replacement?
         * @property [displayRoll=true] Is the Roll result used to draw from this RollTable displayed in chat?
         * @property folder             The _id of a Folder which contains this RollTable
         * @property [sort]             The numeric sort value which orders this RollTable relative to its siblings
         * @property [permission]       An object which configures user permissions to this RollTable
         * @property [flags={}]         An object of optional key/value flags
         */
        interface RollTableSource {
            _id: string;
            name: string;
            img?: ImageFilePath;
            description: string;
            results: TableResultSource[];
            formula: string;
            replacement: boolean;
            displayRoll: boolean;
            folder?: string | null;
            sort: number;
            ownership: Record<string, DocumentOwnershipLevel>;
            flags: Record<string, Record<string, unknown>>;
        }

        interface RollTableMetadata extends abstract.DocumentMetadata {
            name: "RollTable";
            collection: "tables";
            label: "DOCUMENT.RollTable";
            embedded: {
                TableResult: typeof documents.BaseTableResult;
            };
            isPrimary: true;
        }
    }
}
