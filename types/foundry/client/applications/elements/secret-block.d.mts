/**
 * A custom HTML element used to wrap secret blocks in HTML content in order to provide additional interactivity.
 */
export default class HTMLSecretBlockElement extends HTMLElement {
    /**
     * The HTML tag named used by this element.
     */
    static tagName: "secret-block";

    /**
     * The wrapped secret block.
     */
    get secret(): HTMLElement;

    /**
     * The revealed state of the secret block.
     */
    get revealed(): boolean;

    connectedCallback(): void;

    /**
     * Toggle the secret revealed or hidden state in content that this secret block represents.
     * @param content The raw string content for this secret.
     * @returns The modified raw content.
     */
    toggleRevealed(content: string): string;
}
