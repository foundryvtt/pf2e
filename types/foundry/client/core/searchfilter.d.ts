declare class SearchFilter {
    /**
     * The value of the current query string
     */
    query: string;

    /**
     * A callback function to trigger when the tab is changed
     */
    callback: () => void | null;

    /**
     * The CSS selector used to target the tab navigation element
     */
    _inputSelector: string;

    /**
     * A reference to the HTML navigation element the tab controller is bound to
     */
    _input: HTMLElement | null;

    /**
     * The CSS selector used to target the tab content element
     */
    _contentSelector: string;

    /**
     * A reference to the HTML container element of the tab content
     */
    _content: HTMLElement | null;

    /**
     * A debounced function which applies the search filtering
     */
    protected _filter: () => void;

    constructor({
        inputSelector,
        contentSelector,
        initial,
        callback,
        delay,
    }?: {
        inputSelector: string;
        contentSelector: string;
        initial: string;
        callback: () => void;
        delay: number;
    });

    bind(html: HTMLElement): void;
}
