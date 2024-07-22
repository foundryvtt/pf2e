import type { ClientBaseRollTable } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side RollTable document which extends the common BaseRollTable abstraction.
     * Each RollTable document contains RollTableData which defines its data schema.
     * @see {@link data.RollTableData}              The RollTable data schema
     * @see {@link documents.RollTables}            The world-level collection of RollTable documents
     * @see {@link applications.RollTableConfig}    The RollTable configuration application
     */
    class RollTable extends ClientBaseRollTable {
        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Display a result drawn from a RollTable in the Chat Log along.
         * Optionally also display the Roll which produced the result and configure aspects of the displayed messages.
         *
         * @param results      An Array of one or more TableResult Documents which were drawn and should be displayed
         * @param [options={}] Additional options which modify message creation
         * @param [options.roll]              An optional Roll instance which produced the drawn results
         * @param [options.messageData={}]    Additional data which customizes the created messages
         * @param [options.messageOptions={}] Additional options which customize the created messages
         */
        toMessage(
            results: TableResult<this>[],
            {
                roll,
                messageData,
                messageOptions,
            }?: {
                roll?: Roll | null;
                messageData?: Partial<foundry.documents.ChatMessageSource>;
                messageOptions?: ChatMessageCreateOperation;
            },
        ): Promise<ChatMessage | undefined>;

        /**
         * Draw a result from the RollTable based on the table formula or a provided Roll instance
         * @param [options={}]               Optional arguments which customize the draw behavior
         * @param [options.roll]             An existing Roll instance to use for drawing from the table
         * @param [options.recursive=true]   Allow drawing recursively from inner RollTable results
         * @param [options.results]          One or more table results which have been drawn
         * @param [options.displayChat=true] Whether to automatically display the results in chat
         * @param [options.rollMode]         The chat roll mode to use when displaying the result
         * @returns A Promise which resolves to an object containing the executed roll and the produced results
         */
        draw({
            roll,
            recursive,
            results,
            displayChat,
            rollMode,
        }?: {
            roll?: Roll | null;
            recursive?: boolean;
            results?: TableResult<RollTable>[];
            displayChat?: boolean;
            rollMode?: RollMode | "roll" | null;
        }): Promise<RollTableDraw<this>>;

        /**
         * Draw multiple results from a RollTable, constructing a final synthetic Roll as a dice pool of inner rolls.
         * @param number       The number of results to draw
         * @param [options={}] Optional arguments which customize the draw
         * @param [options.roll]             An optional pre-configured Roll instance which defines the dice roll to use
         * @param [options.recursive=true]   Allow drawing recursively from inner RollTable results
         * @param [options.displayChat=true] Automatically display the drawn results in chat? Default is true
         * @param [options.rollMode]         Customize the roll mode used to display the drawn results
         * @returns The drawn results
         */
        drawMany(
            number: number,
            {
                roll,
                recursive,
                displayChat,
                rollMode,
            }?: { roll?: Roll | null; recursive?: boolean; displayChat?: boolean; rollMode?: RollMode | null },
        ): Promise<RollTableDraw<this>>;

        /** Normalize the probabilities of rolling each item in the RollTable based on their assigned weights */
        normalize(): Promise<this>;

        /** Reset the state of the RollTable to return any drawn items to the table */
        reset(): Promise<this>;

        /**
         * Evaluate a RollTable by rolling its formula and retrieving a drawn result.
         *
         * Note that this function only performs the roll and identifies the result, the RollTable#draw function should be
         * called to formalize the draw from the table.
         *
         * @param [roll]    An alternative dice Roll to use instead of the default formula for the table
         * @param recursive If a RollTable entity is drawn as a result, recursively roll it
         * @param _depth    An internal flag used to track recursion depth
         * @returns The Roll and results drawn by that Roll
         *
         * @example
         * // Draw results using the default table formula
         * const defaultResults = await table.roll();
         *
         * // Draw results using a custom roll formula
         * const roll = new Roll("1d20 + @abilities.wis.mod", actor.getRollData());
         * const customResults = await table.roll({roll});
         */
        roll({
            roll,
            recursive,
            _depth,
        }?: {
            roll?: Roll;
            recursive?: boolean;
            _depth?: number;
        }): Promise<RollTableDraw<this>>;

        /**
         * Get an Array of valid results for a given rolled total
         * @param value The rolled value
         * @return An Array of results
         */
        getResultsForRoll(value: number): TableResult<this>[];

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        protected override _onCreateDescendantDocuments(
            parent: this,
            collection: "results",
            documents: TableResult<this>[],
            data: TableResult<this>["_source"][],
            operation: DatabaseCreateOperation<this>,
            userId: string,
        ): void;

        protected override _onDeleteDescendantDocuments(
            parent: this,
            collection: "results",
            documents: TableResult<this>[],
            ids: string[],
            operation: DatabaseDeleteOperation<this>,
            userId: string,
        ): void;

        /* -------------------------------------------- */
        /*  Importing and Exporting                     */
        /* -------------------------------------------- */

        override toCompendium(pack: CompendiumCollection<this>): this["_source"];

        /**
         * Create a new RollTable entity using all of the Entities from a specific Folder as new results.
         * @param folder  The Folder entity from which to create a roll table
         * @param operation Additional options passed to the RollTable.create method
         */
        static fromFolder(folder: Folder, operation?: DatabaseCreateOperation<null>): Promise<RollTable | undefined>;
    }

    interface RollTable extends ClientBaseRollTable {
        readonly results: foundry.abstract.EmbeddedCollection<TableResult<this>>;
    }

    /**
     * @typedef RollTableDraw An object containing the executed Roll and the produced results
     * @property roll    The Dice roll which generated the draw
     * @property results An array of drawn TableResult documents
     */
    interface RollTableDraw<TParent extends RollTable> {
        roll: Roll;
        results: TableResult<TParent>[];
    }
}
