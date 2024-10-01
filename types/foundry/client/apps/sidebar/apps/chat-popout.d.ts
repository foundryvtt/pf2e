declare class ChatPopout extends Application {
    /** The displayed Chat Message document */
    message: ChatMessage;

    constructor(message: ChatMessage, options?: ApplicationOptions);

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
