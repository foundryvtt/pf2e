import type { ChatMessageSource } from "../../../../common/documents/chat-message.d.ts";

declare global {
    /**
     * The Chat Log application displayed in the Sidebar
     * @see {Sidebar}
     */
    class ChatLog<TChatMessage extends ChatMessage = ChatMessage> extends SidebarTab<ChatLogOptions> {
        /** Track whether the user currently has pending text in the chat box */
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
        protected _lastWhisper: TChatMessage | null;

        constructor(options?: Partial<ChatLogOptions>);

        static override get defaultOptions(): ChatLogOptions;

        /** A reference to the Messages collection that the chat log displays */
        get collection(): Messages<TChatMessage>;

        /* -------------------------------------------- */
        /*  Application Rendering                       */
        /* -------------------------------------------- */

        override getData(options?: ChatLogOptions): {
            user: User;
            rollMode: number;
            rollModes: number[];
            isStream: boolean;
        };

        /**
         * Render a batch of additional messages, prepending them to the top of the log
         * @param html The rendered jQuery HTML object
         * @param size The batch size to include
         */
        protected _renderBatch(html: JQuery, size: number): Promise<void>;

        override renderPopout(original: TChatMessage): void;

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
        deleteMessage(messageId: string, { deleteAll }?: { deleteAll?: boolean }): void;

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
        postOne(message: TChatMessage, notify?: boolean): Promise<void>;

        /**
         * Scroll the chat log to the bottom
         */
        protected scrollBottom(): void;

        /**
         * Update the content of a previously posted message after its data has been replaced
         * @param message The ChatMessage instance to update
         * @param notify  Trigger a notification which shows the log as having a new unread message
         */
        updateMessage(message: TChatMessage, notify?: boolean): Promise<void>;

        updateTimestamps(): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
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
        protected processMessage(message: string): Promise<foundry.documents.ChatMessageSource>;

        /**
         * Process messages which are posted using a dice-roll command
         * @param command       The chat command type
         * @param matches       Multi-line matched roll expressions
         * @param chatData      The initial chat data
         * @param createOptions Options used to create the message
         */
        protected _processDiceCommand(
            command: string,
            matches: RegExpMatchArray[],
            chatData: DeepPartial<Omit<ChatMessageSource, "rolls">> & { rolls: (string | RollJSON)[] },
            createOptions: ChatMessageCreateOperation,
        ): Promise<void>;

        protected _contextMenu(html: JQuery): void;

        /**
         * Get the ChatLog entry context options
         * @return The sidebar entry context options
         */
        protected override _getEntryContextOptions(): EntryContextOption[];

        /** Handle keydown events in the chat entry textarea */
        protected _onChatKeyDown(event: KeyboardEvent): void;

        /** Handle clicking of dice tooltip buttons */
        protected _onDiceRollClick(event: JQuery.ClickEvent): void;

        /**
         * Handle scroll events within the chat log container
         * @param event The initial scroll event
         */
        protected _onScrollLog(event: JQuery.TriggeredEvent): void;

        /**
         * Update roll mode select dropdowns when the setting is changed
         * @param {string} mode     The new roll mode setting
         */
        static _setRollMode(mode: RollMode): void;
    }

    interface ChatLogOptions extends ApplicationOptions {
        id: "chat";
        /** Is this chat log being rendered as part of the stream view? */
        stream: boolean;
    }
}
