/**
 * The Chat Log application displayed in the Sidebar
 * @see {Sidebar}
 */
declare class ChatLog extends SidebarTab {
    /**
     * Track whether the user currently has pending text in the chat box
     */
    protected _pendingText: string;

    /**
     * Track the history of the past 5 sent messages which can be accessed using the arrow keys
     */
    protected _sentMessages: string[];

    /**
     * Track which remembered message is being currently displayed to cycle properly
     */
    protected _sentMessageIndex: number;

    /**
     * Track the time when the last message was sent to avoid flooding notifications
     */
    protected _lastMessageTime: number;

    /**
     * Track the id of the last message displayed in the log
     */
    protected _lastId: string | null;

    /**
     * Track the last received message which included the user as a whisper recipient.
     */
    _lastWhisper: ChatMessage | null;

    constructor(options?: {});

    /** @override */
    static get defaultOptions(): typeof SidebarTab['defaultOptions'] & {
        id: 'chat';
        template: string;
        title: string;
        scrollContainer: null;
        stream: boolean;
    };

    /**
     * A reference to the Messages collection that the chat log displays
     */
    get collection(): Game['messages'];

    /* -------------------------------------------- */
    /*  Application Rendering                       */
    /* -------------------------------------------- */

    /** @override */
    getData(options?: { stream?: boolean }): {
        user: User;
        rollMode: number;
        rollModes: number[];
        isStream: boolean;
    };

    /**
     * Render a batch of additional messages, prepending them to the top of the log
     * @param size     The batch size to include
     */
    protected _renderBatch(size: number): Promise<void>;

    /** @override */
    renderPopout(original: ChatMessage): void;

    /* -------------------------------------------- */
    /*  Chat Sidebar Methods                        */
    /* -------------------------------------------- */

    /**
     * Delete all message HTML from the log
     */
    deleteAll(): void;

    /**
     * Delete a single message from the chat log
     * @param messageId The ChatMessage entity to remove from the log
     * @param [deleteAll] Is this part of a flush operation to delete all messages?
     */
    deleteMessage(messageId: string, { deleteAll }?: { deleteAll?: boolean}): void;

    /**
     * Trigger a notification that alerts the user visually and audibly that a new chat log message has been posted
     */
    notify(message: string): void;

    /**
     * Parse a chat string to identify the chat command (if any) which was used
     * @param message The message to match
     * @return The identified command and regex match
     */
    static parse(message: string): string[];

    /**
     * Post a single chat message to the log
     * @param message A ChatMessage entity instance to post to the log
     * @param [notify] Trigger a notification which shows the log as having a new unread message
     * @return A Promise which resolves once the message is posted
     */
    postOne(message: ChatMessage, notify?: boolean): Promise<void>;

    /**
     * Scroll the chat log to the bottom
     */
    protected scrollBottom(): void;

    /**
     * Update the content of a previously posted message after its data has been replaced
     * @param {ChatMessage} message   The ChatMessage instance to update
     * @param {boolean} notify        Trigger a notification which shows the log as having a new unread message
     */
    updateMessage(message: ChatMessage, { notify }?: { notify?: boolean }): void;

    updateTimestamps(): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Activate event listeners triggered within the ChatLog application
     * @param html {jQuery|HTMLElement}
     */
    activateListeners(html: JQuery): void;

    /**
     * Prepare the data object of chat message data depending on the type of message being posted
     * @param message The original string of the message content
     * @return A Promise resolving to the prepared chat data object
     */
    protected processMessage(message: string): Promise<ChatMessageData>;

    /** @todo: Fill remaining properties */
}
