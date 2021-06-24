import { TableResultConstructor } from './constructors';
declare global {
    /**
     * The TableResult embedded document within a RollTable document which extends the BaseRollTable abstraction.
     * Each TableResult belongs to the results collection of a RollTable entity.
     * Each TableResult contains a TableResultData object which provides its source data.
     *
     * @see {@link data.TableResultData}        The TableResult data schema
     * @see {@link documents.RollTable}         The RollTable document which contains TableResult embedded documents
     */
    class TableResult extends TableResultConstructor {
        /** A path reference to the icon image used to represent this result */
        get icon(): string;

        /**
         * Prepare a string representation for the result which (if possible) will be a dynamic link or otherwise plain
         * text
         */
        getChatText(): string;
    }

    interface TableResult {
        readonly parent: RollTable | null;
    }
}
