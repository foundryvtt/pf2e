declare class ChatPopout extends Application {
    /**
     * The displayed Chat Message entity
     */
    message: ChatMessage;

    constructor(message: ChatMessage, options?: {});

    /** @override */
    static get defaultOptions(): (typeof Application)["defaultOptions"] & {
        width: number;
        height: string;
        classes: ["chat-popout"];
    };

    /** @override */
    get id(): string;

    /** @override */
    get title(): string;
}
