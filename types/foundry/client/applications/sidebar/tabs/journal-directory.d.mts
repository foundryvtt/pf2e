import { ApplicationConfiguration } from "@client/applications/_types.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import JournalEntry from "@client/documents/cards.mjs";
import DocumentDirectory from "../document-directory.mjs";

/**
 * The World Journal.
 */
export default class JournalDirectory extends DocumentDirectory<JournalEntry> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "journal";

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[];
}
