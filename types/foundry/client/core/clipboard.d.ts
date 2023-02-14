/**
 * A helper class to manage requesting clipboard permissions and provide common functionality for working with the
 * clipboard.
 */
declare class ClipboardHelper {
    constructor();

    /**
     * Copies plain text to the clipboard in a cross-browser compatible way.
     * @param text The text to copy.
     */
    copyPlainText(text: string): Promise<void>;
}
