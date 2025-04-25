import TokenDocument from "../../documents/token.mjs";
import Token from "../placeables/token.mjs";

export interface ChatBubbleOptions {
    /** An optional array of CSS classes to apply to the resulting bubble */
    cssClasses?: string[] | undefined;
    /** Pan to the token speaker for this bubble, if allowed by the client */
    pan?: boolean | undefined;
    /** Require that the token be visible in order for the bubble to be rendered */
    requireVisible?: boolean | undefined;
}

/**
 * The Chat Bubble Class
 * This application displays a temporary message sent from a particular Token in the active Scene.
 * The message is displayed on the HUD layer just above the Token.
 */
export default class ChatBubbles {
    /**
     * Activate Socket event listeners which apply to the ChatBubbles UI.
     * @param socket The active web socket connection
     * @internal
     */
    static _activateSocketListeners(socket: io.Socket): void;

    /**
     * The Handlebars template used to render Chat Bubbles.
     */
    template: string;

    /**
     * Track active Chat Bubbles
     */
    bubbles: object;

    /**
     * A reference to the chat bubbles HTML container in which rendered bubbles should live
     */
    get container(): JQuery;

    /**
     * Create a chat bubble message for a certain token which is synchronized for display across all connected clients.
     * @param token The speaking Token Document
     * @param message The spoken message text
     * @param options Options which affect the bubble appearance
     * @returns A promise which resolves with the created bubble HTML, or null
     */
    broadcast(token: TokenDocument, message: string, options?: ChatBubbleOptions): Promise<JQuery | null>;

    /**
     * Speak a message as a particular Token, displaying it as a chat bubble
     * @param token The speaking Token
     * @param message The spoken message text
     * @param options Options which affect the bubble appearance
     * @returns A Promise which resolves to the created bubble HTML element, or null
     */
    say(token: Token, message: string, options?: ChatBubbleOptions | undefined): Promise<JQuery | null>;
}
