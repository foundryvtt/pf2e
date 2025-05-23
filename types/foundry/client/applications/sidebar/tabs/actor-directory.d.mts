import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import Actor from "@client/documents/actor.mjs";
import DocumentDirectory, { DocumentDirectoryConfiguration } from "../document-directory.mjs";

/**
 * The World Actor directory listing.
 */
export default class ActorDirectory<TDocument extends Actor<null> = Actor<null>> extends DocumentDirectory<TDocument> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentDirectoryConfiguration>;

    static override tabName: "actors";

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    protected override _canDragStart(): boolean;

    protected override _onDragStart(event: DragEvent): void;
}
