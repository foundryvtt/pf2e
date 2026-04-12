import ChatLog from "@client/applications/sidebar/tabs/chat.mjs";
import { Schema } from "prosemirror-model";
import { EditorState, Plugin, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import ProseMirrorPlugin from "../plugin.mjs";

/**
 * A plugin for the chat message editor which handles interactivity.
 */
export default class ChatInputPlugin extends ProseMirrorPlugin {
    /**
     * @param schema The ProseMirror schema to build the plugin against.
     * @param chat The ChatLog instance this plugin belongs to.
     */
    constructor(schema: Schema, chat: ChatLog);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The ChatLog instance this plugin belongs to.
     */
    get chat(): ChatLog;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Build the plugin.
     * @param {Schema} schema           The ProseMirror schema to build the plugin against.
     * @param {object} [options]
     * @param {ChatLog} [options.chat]  The ChatLog instance this plugin belongs to.
     * @returns {Plugin}
     */
    static build(schema: Schema, options: { chat?: ChatLog }): Plugin;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Inspect transactions and update pending state if they involve insertions or deletions.
     * @param transactions The transactions.
     * @param oldState The editor state before.
     * @param newState The editor state after.
     * @protected
     */
    protected _inspectTransactions(transactions: Transaction[], oldState: EditorState, newState: EditorState): void;

    /**
     * Handle keydown events.
     * @param view The editor view.
     * @param event The keyboard event.
     */
    protected _onKeyDown(view: EditorView, event: KeyboardEvent): boolean | void;

    /**
     * Handle sending a chat message.
     * @param view The editor view.
     */
    sendMessage(view: EditorView): Promise<void>;

    /**
     * Set the contents of the chat input to the given value.
     * @param view The editor view.
     * @param message The message to set.
     * @param meta Any metadata to append to the transaction.
     */
    setMessage(view: EditorView, message: string, meta: object): void;
}
