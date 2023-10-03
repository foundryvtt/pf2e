import * as io from "socket.io";

declare global {
    /**
     * The Collection of JournalEntry documents which exist within the active World.
     * This Collection is accessible within the Game object as game.journal.
     * @see {@link JournalEntry} The JournalEntry entity
     * @see {@link JournalDirectory} The JournalDirectory sidebar directory
     */
    class Journal extends WorldCollection<JournalEntry> {
        static override documentName: "JournalEntry";

        /** Open Socket listeners which transact JournalEntry data */
        protected static _activateSocketListeners(socket: io.Socket): void;

        /**
         * Handle a received request to show a JournalEntry to the current client
         * @param entryId The ID of the journal entry to display for other players
         * @param mode    The JournalEntry mode to display
         * @param force   Display the entry to all players regardless of normal permissions
         */
        static _showEntry(entryId: string, mode?: string, force?: boolean): Promise<void>;
    }
}
