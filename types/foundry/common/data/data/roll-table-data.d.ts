declare module foundry {
    module data {
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
            img: string;
            description: string;
            results: TableResultSource[];
            formula: string;
            replacement: boolean;
            displayRoll: boolean;
            folder?: string | null;
            sort: number;
            permission: Record<string, PermissionLevel>;
            flags: Record<string, unknown>;
        }

        class RollTableData<
            TDocument extends documents.BaseRollTable = documents.BaseRollTable,
            TResults extends documents.BaseTableResult = documents.BaseTableResult,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            /** The default icon used for newly created Macro documents */
            static DEFAULT_ICON: string;

            /** A Collection of TableResult embedded documents which belong to this RollTable */
            results: abstract.EmbeddedCollection<TResults>;
        }

        interface RollTableData extends Omit<RollTableSource, 'results'> {
            readonly _source: RollTableSource;
        }
    }
}
