import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderContext,
} from "@client/applications/_types.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import ChatMessage from "@client/documents/chat-message.mjs";
import Messages from "@client/documents/collections/chat-messages.mjs";
import { ChatSpeakerData } from "@common/documents/chat-message.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/handlebars-application.mjs";
import AbstractSidebarTab from "../sidebar-tab.mjs";

/**
 * The sidebar chat tab.
 */
export default class ChatLog extends HandlebarsApplicationMixin(AbstractSidebarTab) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override tabName: "chat";

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * An enumeration of regular expression patterns used to match chat messages.
     */
    static MESSAGE_PATTERNS: Record<string, RegExp>;

    /**
     * The set of commands that can be processed over multiple lines.
     */
    static MULTILINE_COMMANDS: Set<"roll" | "gmroll" | "blindroll" | "selfroll" | "publicroll">;

    /**
     * The maximum number of messages to retain in the history in a given session.
     */
    static MAX_MESSAGE_HISTORY: number;

    /**
     * The number of milliseconds to keep a chat card notification until it is automatically dismissed.
     */
    static NOTIFY_DURATION: number;

    /**
     * The notification ticker frequency.
     */
    static NOTIFY_TICKER: number;

    /**
     * The number of milliseconds to wait before unpausing the notification queue.
     */
    static NOTIFY_UNPAUSE: number;

    /**
     * The number of milliseconds to display the chat notification pip.
     */
    static PIP_DURATION: number;

    /**
     * How often, in milliseconds, to update timestamps.
     */
    static UPDATE_TIMESTAMP_FREQUENCY: number;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A reference to the Messages collection that the chat log displays.
     */
    get collection(): Messages;

    /**
     * Message history management.
     */
    get history(): { queue: string[]; index: number; pending: string };

    /**
     * A flag for whether the chat log is currently scrolled to the bottom.
     */
    get isAtBottom(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _configureRenderOptions(options: DeepPartial<HandlebarsRenderOptions>): void;

    /**
     * Get context menu entries for chat messages in the log.
     */
    protected _getEntryContextOptions(): ContextMenuEntry[];

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    /**
     * Prepare rendering context for the chat panel's message input component.
     */
    protected _prepareInputContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _renderHTML(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<Record<string, HTMLElement>>;

    protected override _preSyncPartState(
        partId: string,
        newElement: HTMLElement,
        priorElement: HTMLElement,
        state: object,
    ): void;

    /**
     * Prepare data used to synchronize the state of the chat input.
     * @param newElement The newly-rendered element.
     * @param priorElement The existing element.
     * @param state A state object which is used to synchronize after replacement.
     */
    protected _preSyncInputState(newElement: HTMLElement, priorElement: HTMLElement, state: object): void;

    protected override _syncPartState(
        partId: string,
        newElement: HTMLElement,
        priorElement: HTMLElement,
        state: object,
    ): void;

    /**
     * Synchronize the state of the chat input.
     * @param newElement The newly-rendered element.
     * @param priorElement The element being replaced.
     * @param state The state object used to synchronize the pre- and post-render states.
     */
    _syncInputState(newElement: HTMLElement, priorElement: HTMLElement, state: object): void;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _attachPartListeners(
        partId: string,
        element: HTMLElement,
        options: HandlebarsRenderOptions,
    ): void;

    /**
     * Attach listeners to the chat log.
     */
    protected _attachLogListeners(element: HTMLElement, options: HandlebarsRenderOptions): void;

    protected _onActivate(): void;

    /**
     * Handle clicking a chat card notification.
     * Treat action button clicks within the Notifications UI as action clicks on the ChatLog instance itself.
     * @param event  The triggering event.
     */
    protected _onClickNotification(event: PointerEvent): void;

    protected override _onClose(options: ApplicationClosingOptions): void;

    protected _onDeactivate(): void;

    /**
     * Handle keydown events in the chat message entry textarea.
     * @param event The triggering event.
     */
    protected _onKeyDown(event: KeyboardEvent): void;

    protected override _preClose(options: ApplicationClosingOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Message Input                               */
    /* -------------------------------------------- */

    /**
     * Parse a chat string to identify the chat command (if any) which was used.
     * @param message The message to parse.
     * @returns The identified command and regex match.
     */
    static parse(message: string): [string, (string | RegExpMatchArray)[]];

    /**
     * Prepare the data object of chat message data depending on the type of message being posted.
     * @param message The original string of the message content
     * @param options Additional options
     * @param options.speaker The speaker data
     * @returns The created ChatMessage Document, or void if we were executing a macro instead.
     * @throws If an invalid command is found.
     */
    processMessage(message: string, options?: { speaker?: ChatSpeakerData }): Promise<ChatMessage | undefined>;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Delete a single message from the chat log.
     * @param messageId The ID of the ChatMessage Document to remove from the log.
     * @param options.deleteAll Delete all messages from the log.
     */
    deleteMessage(messageId: string, options?: { deleteAll?: boolean }): Promise<void>;

    /**
     * Trigger a notification that alerts the user visually and audibly of new chat activity.
     * @param message The created or updated message.
     * @param options.existing The existing rendered chat card, if it exists.
     * @param options.newMessage Whether this is a new message.
     */
    notify(message: ChatMessage, options?: { existing?: HTMLElement; newMessage?: boolean }): void;

    /**
     * Post a single chat message to the log.
     * @param message The chat message.
     * @param options.before An existing message ID to prepend the posted message to, by default the new message is
     *                       appended to the end of the log.
     * @param options.notify=false Trigger a notification which shows the log as having a new unread message.
     * @returns A Promise which resolves once the message has been posted.
     */
    postOne(message: ChatMessage, options?: { before?: string; notify?: boolean }): Promise<void>;

    /**
     * Render a batch of additional messages, prepending them to the top of the log.
     * @param size The batch size.
     */
    renderBatch(size: number): Promise<void>;

    /**
     * Scroll the chat log to the bottom.
     * @param options.popout=false If a popout exists, scroll it to the bottom too.
     * @param options.waitImages Wait for any images embedded in the chat log to load first before scrolling.
     * @param options.scrollOptions Options to configure scrolling behavior.
     */
    scrollBottom(options?: {
        popout?: boolean;
        waitImages?: boolean;
        scrollOptions?: ScrollIntoViewOptions;
    }): Promise<void>;

    /**
     * Update the contents of a previously-posted message.
     * @param message The ChatMessage instance to update.
     * @param options.notify Trigger a notification which shows the log as having a new unread message.
     */
    updateMessage(message: ChatMessage, options?: { notify?: boolean }): Promise<void>;

    /**
     * Update displayed timestamps for every displayed message in the chat log.
     * Timestamps are displayed in a humanized "time-since" format.
     */
    updateTimestamps(): void;

    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * Handles chat message rendering during the ChatMessage#getHTML deprecation period. After that period ends, calls to
     * this method can be replaced by ChatMessage#renderHTML.
     * @param message The chat message to render.
     * @param options Options forwarded to the render function.
     * @throws If the message's render methods do not return a usable result.
     */
    static renderMessage(message: ChatMessage, options?: object): Promise<HTMLElement>;

    /**
     * Determine whether the notifications pane should be visible.
     * @param options.closing Whether the chat popout is closing.
     */
    protected _shouldShowNotifications(options?: { closing?: boolean }): boolean;

    /**
     * Update notification display, based on interface state.
     * If the chat log is popped-out, embed chat input into it. Otherwise,
     * if the sidebar is expanded, and the chat log is the active tab, embed chat input into it. Otherwise,
     * embed chat input into the notifications area.
     * If the sidebar is expanded, and the chat log is the active tab, do not display notifications.
     * If the chat log is popped out, do not display notifications.
     * @param options.closing Whether this method has been triggered by the chat popout closing.
     * @internal
     */
    _toggleNotifications(options?: { closing?: boolean }): void;

    /**
     * Handle updating the roll mode display.
     * @internal
     */
    _updateRollMode(): void;
}
