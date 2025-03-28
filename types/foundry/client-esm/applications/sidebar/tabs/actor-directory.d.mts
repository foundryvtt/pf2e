import type DocumentDirectory from "../document-directory.d.mts";
import type { DocumentDirectoryConfiguration } from "../document-directory.d.mts";

/**
 * The World Actor directory listing.
 */
export default class ActorDirectory<TDocument extends Actor<null> = Actor<null>> extends DocumentDirectory<TDocument> {
    static DEFAULT_OPTIONS: Partial<DocumentDirectoryConfiguration>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    override get collection(): Actors<TDocument>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    protected override _canDragStart(selector: string): boolean;

    protected override _onDragStart(event: DragEvent): void;
}
