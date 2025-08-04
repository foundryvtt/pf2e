import Note from "@client/canvas/placeables/note.mjs";
import { DatabaseDeleteCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import EmbeddedCollection from "@common/abstract/embedded-collection.mjs";
import JournalSheet from "../appv1/sheets/journal-sheet.mjs";
import { BaseJournalEntry, JournalEntryPage, JournalEntrySource } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

type BaseJournalEntryStatic = typeof BaseJournalEntry;
interface ClientBaseJournalEntryStatic extends BaseJournalEntryStatic, ClientDocumentStatic {}

declare const ClientBaseJournalEntry: {
    new (...args: any): BaseJournalEntry & ClientDocument<null>;
} & ClientBaseJournalEntryStatic;

interface ClientBaseJournalEntry extends InstanceType<typeof ClientBaseJournalEntry> {}

/**
 * The client-side JournalEntry document which extends the common BaseJournalEntry model.
 *
 * @see {@link Journal}                       The world-level collection of JournalEntry documents
 * @see {@link JournalSheet}                  The JournalEntry configuration application
 */
export default class JournalEntry extends ClientBaseJournalEntry {
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
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;
}

export default interface JournalEntry extends ClientBaseJournalEntry {
    readonly _source: JournalEntrySource;
    readonly pages: EmbeddedCollection<JournalEntryPage<this>>;

    get sheet(): JournalSheet<this>;
}

export {};
