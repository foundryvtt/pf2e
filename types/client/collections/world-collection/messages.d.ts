declare class Messages<T extends ChatMessage = ChatMessage> extends WorldCollection<T> {
    /** @override */
    get documentName(): 'ChatMessage';

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * If requested, dispatch a Chat Bubble UI for the newly created message
     * @param response  The created ChatMessage response
     */
    protected _sayBubble(response: object): void;

    /**
     * Handle export of the chat log to a text file
     */
    protected export(): void;

    /**
     * Allow for bulk deletion of all chat messages, confirm first with a yes/no dialog.
     * @see {@link Dialog.confirm}
     */
    flush(): Promise<any>;
}
