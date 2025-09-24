import DocumentSheetV2 from "@client/applications/api/document-sheet.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import Token from "../canvas/placeables/token.mjs";
import { BaseMacro, MacroSource } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";
import Actor from "./actor.mjs";

type BaseMacroStatic = typeof BaseMacro;
interface ClientBaseMacroStatic extends BaseMacroStatic, ClientDocumentStatic {}

declare const ClientBaseMacro: {
    new (...args: any): BaseMacro & ClientDocument<null>;
} & ClientBaseMacroStatic;

interface ClientBaseMacro extends InstanceType<typeof ClientBaseMacro> {}

/**
 * The client-side Folder document which extends the common BaseFolder model.
 *
 * @see {@link Folders}                     The world-level collection of Folder documents
 * @see {@link FolderConfig}                The Folder configuration application
 */
export default class Macro extends ClientBaseMacro {
    /* -------------------------------------------- */
    /*  Model Properties                            */
    /* -------------------------------------------- */

    /** Is the current User the author of this macro? */
    get isAuthor(): boolean;

    /** Test whether the current user is capable of executing a Macro script */
    get canExecute(): boolean;

    /** Provide a thumbnail image path used to represent this document. */
    get thumbnail(): ImageFilePath;

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    /**
     * Execute the Macro command.
     * @param [scope={}]    Macro execution scope which is passed to script macros
     * @param [scope.actor] An Actor who is the protagonist of the executed action
     * @param [scope.token] A Token which is the protagonist of the executed action
     * @returns A created ChatMessage from chat macros or returned value from script macros
     */
    execute(scope?: { actor?: Actor; token?: Token; [k: string]: unknown }): unknown;
}

export default interface Macro extends ClientBaseMacro {
    readonly _source: MacroSource;
    get sheet(): DocumentSheetV2;
}

export {};
