import RollTableDirectory from "@client/applications/sidebar/tabs/roll-table-directory.mjs";
import WorldCollection from "../abstract/world-collection.mjs";
import RollTable from "../roll-table.mjs";

/**
 * The Collection of RollTable documents which exist within the active World.
 * This Collection is accessible within the Game object as game.tables.
 * @see {@link RollTable} The RollTable document
 * @see {@link RollTableDirectory} The RollTableDirectory sidebar directory
 */
export default class RollTables extends WorldCollection<RollTable> {
    static override documentName: "RollTable";

    /** Register world settings related to RollTable entities */
    static registerSettings(): void;
}

export default interface RollTables extends WorldCollection<RollTable> {
    get directory(): RollTableDirectory;
}
