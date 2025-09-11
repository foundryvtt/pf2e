import { ClientDocument } from "@client/documents/abstract/client-document.mjs";

export interface HTMLSecretConfiguration {
    /** The CSS selector used to target content that contains secret blocks. */
    parentSelector: string;
    /** An object of callback functions for each operation. */
    callbacks: {
        /**
         * @param secret The secret element whose surrounding content we wish to retrieve.
         * @returns The content where the secret is housed.
         */
        content: (secret: HTMLElement) => string;
        /**
         * @param secret  The secret element that is being manipulated.
         * @param content The content block containing the updated secret element.
         * @returns The updated Document.
         */
        update: (secret: HTMLElement, content: string) => Promise<ClientDocument>;
    };
}

/**
 * A composable class for managing functionality for secret blocks within DocumentSheets.
 * @see {@link foundry.applications.api.DocumentSheet}
 * @example Activate secret revealing functionality within a certain block of content.
 * ```js
 * const secrets = new HTMLSecret({
 *   selector: "section.secret[id]",
 *   callbacks: {
 *     content: this._getSecretContent.bind(this),
 *     update: this._updateSecret.bind(this)
 *   }
 * });
 * secrets.bind(html);
 * ```
 */
export default class HTMLSecret {
    /** The CSS selector used to target secret blocks. */
    parentSelector: HTMLSecretConfiguration["parentSelector"];

    /** An object of callback functions for each operation. */
    callbacks: HTMLSecretConfiguration["callbacks"];

    /**
     *  @param config Configuration options.
     */
    constructor(config: HTMLSecretConfiguration);

    /**
     * Add event listeners to the targeted secret blocks.
     * @param html The HTML content to select secret blocks from.
     */
    bind(html: HTMLElement): void;

    /**
     * Handle toggling a secret's revealed state.
     * @param event The triggering click event.
     * @returns The Document whose content was modified.
     */
    protected _onToggleSecret(event: PointerEvent): Promise<ClientDocument | void>;
}
