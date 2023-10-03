/**
 * The Collection of RollTable documents which exist within the active World.
 * This Collection is accessible within the Game object as game.tables.
 * @see {@link RollTable} The RollTable document
 * @see {@link RollTableDirectory} The RollTableDirectory sidebar directory
 */
declare class RollTables extends WorldCollection<RollTable> {
    static override documentName: "RollTable";

    override get directory(): RollTableDirectory;

    /** Register world settings related to RollTable entities */
    static registerSettings(): void;
}
