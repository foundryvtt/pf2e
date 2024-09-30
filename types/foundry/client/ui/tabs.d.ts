declare interface TabsOptions {
    navSelector?: string;
    contentSelector?: string;
    group?: string;
    initial?: string;
    callback?: (...args: unknown[]) => void;
}

/**
 * A controller class for managing tabbed navigation within an Application instance.
 * @see {@link Application}
 *
 * @param navSelector       The CSS selector used to target the navigation element for these tabs
 * @param contentSelector   The CSS selector used to target the content container for these tabs
 * @param initial           The tab name of the initially active tab
 * @param callback          An optional callback function that executes when the active tab is changed
 *
 * @example
 * <!-- Example HTML -->
 * <nav class="tabs">
 *   <a class="item" data-tab="tab1">Tab 1</li>
 *   <a class="item" data-tab="tab2">Tab 2</li>
 * </nav>
 *
 * <section class="content">
 *   <div class="tab" data-tab="tab1">Content 1</div>
 *   <div class="tab" data-tab="tab2">Content 2</div>
 * </section>
 *
 * @example
 * // JavaScript
 * const tabs = new Tabs({navSelector: ".tabs", contentSelector: ".content", initial: "tab1"});
 * tabs.bind(html);
 */
declare class Tabs {
    /** The value of the active tab */
    active: string;

    /** A callback function to trigger when the tab is changed */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: ((...args: any[]) => void) | null;

    /** The CSS selector used to target the tab navigation element */
    _navSelector: string;

    /** A reference to the HTML navigation element the tab controller is bound to */
    _nav: HTMLElement | null;

    /** The CSS selector used to target the tab content element */
    _contentSelector: string;

    /** A reference to the HTML container element of the tab content */
    _content: HTMLElement | null;

    constructor({ navSelector, contentSelector, initial, callback }: TabsOptions);

    /** Bind the Tabs controller to an HTML application */
    bind(html: HTMLElement): void;

    /** Activate a new tab by name */
    activate(tabName: string, { triggerCallback }?: { triggerCallback?: boolean }): void;

    /**
     * Handle click events on the tab navigation entries
     * @param event A left click event
     */
    protected _onClickNav(event: MouseEvent): void;
}
