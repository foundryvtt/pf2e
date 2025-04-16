export class ProseMirrorDropDown {
    /** The default title for this drop-down.  */
    title: string;

    /** The items configured for this drop-down. */
    items: ProseMirrorMenuItem[];

    /**
     * A class responsible for rendering a menu drop-down.
     * @param title                             The default title.
     * @param items                             The configured menu items.
     * @param [options]
     * @param [options.cssClass]                The menu CSS class name. Required if providing an action.
     * @param [options.icon]                    Use an icon for the dropdown rather than a text label.
     * @param [options.onAction]                A callback to fire when a menu item is clicked.
     */
    constructor(
        title: string,
        items: ProseMirrorMenuItem[],
        options?: { cssClass?: string; icon: string; onAction?: (event: MouseEvent) => void },
    );

    /** Attach event listeners. */
    activateListeners(html: HTMLElement): void;

    /**
     * Construct the drop-down menu's HTML.
     * @returns HTML contents as a string.
     */
    render(): string;

    /**
     * Recurse through the menu structure and apply a function to each item in it.
     * @param fn  The function to call on each item. Return false to prevent
     *            iterating over any further items.
     */
    forEachItem(fn: (item: ProseMirrorMenuItem) => boolean): void;

    /**
     * Render a list of drop-down menu items.
     * @param   entries  The menu items.
     * @returns          HTML contents as a string.
     */
    protected static _renderMenu(entries: ProseMirrorMenuItem[]): string;

    /* -------------------------------------------- */

    /**
     * Render an individual drop-down menu item.
     * @param   item  The menu item.
     * @returns       HTML contents as a string.
     */
    protected static _renderMenuItem(item: ProseMirrorMenuItem): string;
}
