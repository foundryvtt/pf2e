import { ApplicationConfiguration } from "@client/applications/_types.mjs";
import { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import Scene from "@client/documents/scene.mjs";
import DocumentDirectory from "../document-directory.mjs";

/**
 * The World Scene directory listing.
 */
export default class SceneDirectory extends DocumentDirectory<Scene> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "scenes";

    protected static override _entryPartial: string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _canRender(options: HandlebarsRenderOptions): false | void;

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    protected override _getFolderContextOptions(): ContextMenuEntry[];
}
