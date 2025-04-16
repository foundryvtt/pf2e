/**
 * A singleton helper class to manage requesting clipboard permissions.
 * Provoides common functionality for working with the clipboard.
 * @see {@link foundry.Game#clipboard}
 */
export default class ClipboardHelper {
    constructor();

    /**
     * Copies plain text to the clipboard in a cross-browser compatible way.
     * @param text The text to copy.
     */
    copyPlainText(text: string): Promise<void>;
}
