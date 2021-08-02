import { MacroConstructor } from "./constructors";

declare global {
    /**
     * The client-side Macro document which extends the common BaseMacro abstraction.
     * Each Macro document contains MacroData which defines its data schema.
     *
     * @see {@link data.MacroData}              The Macro data schema
     * @see {@link documents.Macros}            The world-level collection of Macro documents
     * @see {@link applications.MacroConfig}    The Macro configuration application
     */
    class Macro extends MacroConstructor {
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Is the current User the author of this macro? */
        get isAuthor(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Execute the Macro command.
         * @param [scope={}]    Provide some additional scope configuration for the Macro
         * @param [scope.actor] An Actor who is the protagonist of the executed action
         * @param [scope.token] A Token which is the protagonist of the executed action
         */
        execute({ actor, token }?: { actor?: Actor; token?: Token }): void;

        /**
         * Execute the command as a chat macro.
         * Chat macros simulate the process of the command being entered into the Chat Log input textarea.
         */
        protected _executeChat({ actor, token }?: { actor?: Actor; token?: Token }): void;

        /**
         * Execute the command as a script macro.
         * Script Macros are wrapped in an async IIFE to allow the use of asynchronous commands and await statements.
         */
        protected _executeScript({ actor, token }?: { actor?: Actor; token?: Token }): void;
    }
}
