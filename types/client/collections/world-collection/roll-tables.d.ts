/**
 * The Collection of RollTable documents which exist within the active World.
 * This Collection is accessible within the Game object as game.tables.
 * @see {@link RollTable} The RollTable document
 * @see {@link RollTableDirectory} The RollTableDirectory sidebar directory
 */
declare class RollTables extends WorldCollection<RollTable> {
    /** @override */
    static documentName: 'RollTable';

    /** @override */
    get directory(): SidebarDirectory;

    /** Register world settings related to RollTable entities */
    static registerSettings(): void;
}
