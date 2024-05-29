import type { ClientBaseJournalEntry } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side JournalEntry document which extends the common BaseJournalEntry model.
     *
     * @see {@link Journal}                       The world-level collection of JournalEntry documents
     * @see {@link JournalSheet}                  The JournalEntry configuration application
     */
    class JournalEntry extends ClientBaseJournalEntry {
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** A boolean indicator for whether or not the JournalEntry is visible to the current user in the directory sidebar */
        override get visible(): boolean;

        /**
         * Return a reference to the Note instance for this Journal Entry in the current Scene, if any.
         * If multiple notes are placed for this Journal Entry, only the first will be returned.
         */
        get sceneNote(): Note | null;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Show the JournalEntry to connected players.
         * By default the entry will only be shown to players who have permission to observe it.
         * If the parameter force is passed, the entry will be shown to all players regardless of normal permission.
         *
         * @param mode  Which JournalEntry mode to display? Default is text.
         * @param force Display the entry to all players regardless of normal permissions
         * @return A Promise that resolves back to the shown entry once the request is processed
         */
        show(mode?: string, force?: boolean): Promise<JournalEntry>;

        /**
         * If the JournalEntry has a pinned note on the canvas, this method will animate to that note
         * The note will also be highlighted as if hovered upon by the mouse
         * @param [options={}] Options which modify the pan operation
         * @param [scale=1.5] The resulting zoom level
         * @param [duration=250] The speed of the pan animation in milliseconds
         * @return A Promise which resolves once the pan animation has concluded
         */
        panToNote({ scale, duration }?: { scale?: number; duration?: number }): Promise<void>;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<null>,
            userId: string,
        ): void;

        protected override _onDelete(options: DatabaseDeleteOperation<null>, userId: string): void;
    }

    interface JournalEntry extends ClientBaseJournalEntry {
        readonly pages: foundry.abstract.EmbeddedCollection<JournalEntryPage<this>>;

        get sheet(): JournalSheet<this>;
    }
}
