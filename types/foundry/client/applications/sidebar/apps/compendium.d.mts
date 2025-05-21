import { ApplicationRenderContext } from "@client/applications/_types.mjs";
import { HandlebarsRenderOptions, HandlebarsTemplatePart } from "@client/applications/api/handlebars-application.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import { CompendiumDocument } from "@client/documents/_module.mjs";
import CompendiumCollection from "@client/documents/collections/compendium-collection.mjs";
import { CompendiumDocumentType, DocumentUUID } from "@client/utils/_module.mjs";
import DocumentDirectory, { DocumentDirectoryConfiguration } from "../document-directory.mjs";

/**
 * An Application that displays the indexed contents of a Compendium pack.
 */
export default class Compendium<TDocument extends CompendiumDocument = CompendiumDocument> extends DocumentDirectory<
    CompendiumCollection<TDocument>
> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentDirectoryConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    protected static override _entryPartial: string;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    override get isPopout(): boolean;

    override get title(): string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _initializeApplicationOptions(
        options: DeepPartial<DocumentDirectoryConfiguration>,
    ): DocumentDirectoryConfiguration;

    protected override _canCreateEntry(): boolean;

    protected override _canCreateFolder(): boolean;

    protected override _canRender(options: HandlebarsRenderOptions): false | void;

    protected override _configureRenderOptions(options: HandlebarsRenderOptions): void;

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    protected override _getFolderContextOptions(): ContextMenuEntry[];

    protected override _prepareHeaderContext(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _onCreateEntry(event: PointerEvent, target: HTMLElement): Promise<TDocument | undefined>;

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    protected override _canDragDrop(selector: string): boolean;

    protected override _createDroppedEntry(entry, updates?: Record<string, unknown>): TDocument | null;

    protected override _entryAlreadyExists(entry): boolean;

    protected override _getEntryDragData(entryId: string): { type: CompendiumDocumentType; uuid: DocumentUUID };
}
