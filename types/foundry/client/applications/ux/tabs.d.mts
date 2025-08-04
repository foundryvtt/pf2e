export interface TabsConfiguration {
    /** The name of the tabs group */
    group?: string;
    /** The CSS selector used to target the navigation element for these tabs */
    navSelector: string;
    /** The CSS selector used to target the content container for these tabs */
    contentSelector: string;
    /** The tab name of the initially active tab */
    initial?: string;
    /** An optional callback function that executes when the active tab is changed */
    callback?: ((arg0: null, tabs: Tabs, tabName: string) => void) | null;
}

/**
 * A controller class for managing tabbed navigation within an Application instance.
 * @see {@link foundry.applications.api.ApplicationV2}
 *
 * @example Configure tab-control for a set of HTML elements
 * ```html
 * <!-- Example HTML -->
 * <nav class="tabs" data-group="primary-tabs">
 *   <a class="item" data-tab="tab1" data-group="primary-tabs">Tab 1</li>
 *   <a class="item" data-tab="tab2" data-group="primary-tabs">Tab 2</li>
 * </nav>
 *
 * <section class="content">
 *   <div class="tab" data-tab="tab1" data-group="primary-tabs">Content 1</div>
 *   <div class="tab" data-tab="tab2" data-group="primary-tabs">Content 2</div>
 * </section>
 * ```
 * Activate tab control in JavaScript
 * ```js
 * const tabs = new foundry.applications.ux.Tabs({navSelector: ".tabs", contentSelector: ".content", initial: "tab1"});
 * tabs.bind(html);
 * ```
 */
export default class Tabs {
    /**
     * @param config The Tabs Configuration to use for this tabbed container
     */
    constructor(config?: TabsConfiguration);

    /** The name of the tabs group */
    group: TabsConfiguration["group"];

    /** The value of the active tab */
    active: string;

    /** A callback function to trigger when the tab is changed */
    callback: TabsConfiguration["callback"];

    /**
     * The CSS selector used to target the tab navigation element
     * @internal
     */
    _navSelector: TabsConfiguration["navSelector"];

    /**
     * A reference to the HTML navigation element the tab controller is bound to
     * @internal
     */
    _nav: HTMLElement | null;

    /**
     * The CSS selector used to target the tab content element
     * @internal
     */
    _contentSelector: TabsConfiguration["contentSelector"];

    /**
     * A reference to the HTML container element of the tab content
     * @internal
     */
    _content: HTMLElement | null;

    /**
     * Bind the Tabs controller to an HTML application
     * @param html
     */
    bind(html: HTMLElement): void;

    /**
     * Activate a new tab by name
     * @param tabName
     * @param [options.triggerCallback]
     */
    activate(tabName: string, options?: { triggerCallback?: boolean }): void;

    /**
     * Handle click events on the tab navigation entries
     * @param event A left click event
     */
    protected _onClickNav(event: PointerEvent): void;
}
