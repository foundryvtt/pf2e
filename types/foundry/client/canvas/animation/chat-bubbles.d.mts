/**
 * @typedef {Object} ChatBubbleOptions
 * @property {string[]} [cssClasses]    An optional array of CSS classes to apply to the resulting bubble
 * @property {boolean} [pan=true]       Pan to the token speaker for this bubble, if allowed by the client
 * @property {boolean} [requireVisible=false] Require that the token be visible in order for the bubble to be rendered
 */
/**
 * The Chat Bubble Class
 * This application displays a temporary message sent from a particular Token in the active Scene.
 * The message is displayed on the HUD layer just above the Token.
 */
export default class ChatBubbles {
    /**
     * Activate Socket event listeners which apply to the ChatBubbles UI.
     * @param {Socket} socket     The active web socket connection
     * @internal
     */
    static _activateSocketListeners(socket: Socket): void;
    /**
     * The Handlebars template used to render Chat Bubbles.
     * @type {string}
     */
    template: string;
    /**
     * Track active Chat Bubbles
     * @type {object}
     */
    bubbles: object;
    /**
     * A reference to the chat bubbles HTML container in which rendered bubbles should live
     * @returns {jQuery}
     */
    get container(): jQuery;
    /**
     * Create a chat bubble message for a certain token which is synchronized for display across all connected clients.
     * @param {TokenDocument} token           The speaking Token Document
     * @param {string} message                The spoken message text
     * @param {ChatBubbleOptions} [options]   Options which affect the bubble appearance
     * @returns {Promise<jQuery|null>}        A promise which resolves with the created bubble HTML, or null
     */
    broadcast(token: TokenDocument, message: string, options?: ChatBubbleOptions | undefined): Promise<jQuery | null>;
    /**
     * Speak a message as a particular Token, displaying it as a chat bubble
     * @param {Token} token                   The speaking Token
     * @param {string} message                The spoken message text
     * @param {ChatBubbleOptions} [options]   Options which affect the bubble appearance
     * @returns {Promise<JQuery|null>}        A Promise which resolves to the created bubble HTML element, or null
     */
    say(token: Token, message: string, { cssClasses, requireVisible, pan }?: ChatBubbleOptions | undefined): Promise<JQuery | null>;
    _panned: any;
    #private;
}
export type ChatBubbleOptions = {
    /**
     * An optional array of CSS classes to apply to the resulting bubble
     */
    cssClasses?: string[] | undefined;
    /**
     * Pan to the token speaker for this bubble, if allowed by the client
     */
    pan?: boolean | undefined;
    /**
     * Require that the token be visible in order for the bubble to be rendered
     */
    requireVisible?: boolean | undefined;
};
import TokenDocument from "../../documents/token.mjs";
