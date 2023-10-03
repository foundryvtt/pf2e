/**
 * The Collection of ChatMessage documents which exist within the active World.
 * This Collection is accessible within the Game object as game.messages.
 * @see {@link ChatMessage} The ChatMessage entity
 * @see {@link ChatLog} The ChatLog sidebar directory
 */
declare class Messages<TChatMessage extends ChatMessage = ChatMessage> extends WorldCollection<TChatMessage> {
    /** @override */
    static documentName: "ChatMessage";

    /** @override */
    render(force?: boolean): void;

    /**
     * If requested, dispatch a Chat Bubble UI for the newly created message
     * @param message The ChatMessage entity to say
     */
    sayBubble(message: ChatMessage): void;

    /** Handle export of the chat log to a text file */
    export(): void;

    /**
     * Allow for bulk deletion of all chat messages, confirm first with a yes/no dialog.
     * @see {@link Dialog.confirm}
     */
    flush(): Promise<unknown>;
}
