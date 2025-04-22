import { ApplicationConfiguration } from "@client/applications/_types.mjs";
import Macro from "@client/documents/macro.mjs";
import DocumentDirectory from "../document-directory.mjs";

/**
 * The World Macro directory listing.
 */
export default class MacroDirectory extends DocumentDirectory<Macro> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "macros";
}
