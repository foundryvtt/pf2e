import type { ClientBaseMacro } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Folder document which extends the common BaseFolder model.
     *
     * @see {@link Folders}                     The world-level collection of Folder documents
     * @see {@link FolderConfig}                The Folder configuration application
     */
    class Macro extends ClientBaseMacro {
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
}
