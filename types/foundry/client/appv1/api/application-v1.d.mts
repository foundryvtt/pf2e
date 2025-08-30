import { Tabs } from "@client/applications/ux/_module.mjs";
import DragDrop from "@client/applications/ux/drag-drop.mjs";
import { TabsConfiguration } from "@client/applications/ux/tabs.mjs";
import { UserAction } from "@common/constants.mjs";
import SearchFilter, { SearchFilterConfiguration } from "../../applications/ux/search-filter.mjs";

interface ApplicationV1Options {
    /** A named "base application" which generates an additional hook */
    baseApplication: string | null;
    /** The default pixel width for the rendered HTML */
    width: number | string | null;
    /** The default pixel height for the rendered HTML */
    height: number | string | null;
    /** The default offset-top position for the rendered HTML */
    top: number | null;
    /** The default offset-left position for the rendered HTML */
    left: number | null;
    /** A transformation scale for the rendered HTML */
    scale?: number | null;
    /** Whether to display the application as a pop-out container */
    popOut: boolean;
    /** Whether the rendered application can be minimized (popOut only) */
    minimizable: boolean;
    /** Whether the rendered application can be drag-resized (popOut only) */
    resizable: boolean | null;
    /** The default CSS id to assign to the rendered HTML */
    id: string;
    /** An array of CSS string classes to apply to the rendered HTML */
    classes: string[];
    /** Track Tab navigation handlers which are active for this Application */
    tabs: TabsConfiguration[];
    dragDrop: {
        callbacks?: {
            dragover?: Function;
            dragstart?: Function;
            drop?: Function;
        };
        dragSelector?: Maybe<string>;
        dropSelector?: Maybe<string>;
    }[];
    /** A default window title string (popOut only) */
    title: string;
    /** The default HTML template path to render for this Application */
    template: string | null;
    /**
     * A list of unique CSS selectors which target containers that should
     * have their vertical scroll positions preserved during a re-render.
     */
    scrollY: string[];
    /** filters An array of {@link SearchFilter} configuration objects. */
    filters: SearchFilterConfiguration[];
}

export interface AppV1RenderOptions extends Partial<ApplicationV1Options> {
    /** Apply focus to the application, maximizing it and bringing it to the top of the vertical stack. */
    focus?: boolean;
    /** A context-providing string which suggests what event triggered the render */
    renderContext?: string;
    /** The data change which motivated the render request */
    renderData?: Record<string, unknown>[];
    // Undocumented
    action?: UserAction;
    // Undocumented: applicable only to `FormApplication`s
    editable?: boolean;
}

export interface ApplicationV1HeaderButton {
    label: string;
    class: string;
    icon: string;
    onclick: ((event: Event) => void) | null;
}

/**
 * The legacy application window that is rendered for some UI elements in Foundry VTT.
 * @deprecated since v13
 */
export default abstract class Application<TOptions extends ApplicationV1Options = ApplicationV1Options> {
    constructor(options?: Partial<TOptions>);

    /** The options provided to this application upon initialization */
    options: TOptions;

    /** An internal reference to the HTML element this application renders */
    protected _element: JQuery;

    /** Track the current position and dimensions of the Application UI */
    position: ApplicationPosition;

    /** DragDrop workflow handlers which are active for this Application */
    protected _dragDrop: DragDrop[];

    /** Tab navigation handlers which are active for this Application */
    protected _tabs: Tabs[];

    /** SearchFilter handlers which are active for this Application */
    protected _searchFilters: SearchFilter[];

    /** Track whether the Application is currently minimized */
    _minimized: boolean;

    /**
     * The prior render state of this Application.
     * This allows for rendering logic to understand if the application is being rendered for the first time.
     */
    _priorState: ApplicationRenderState;

    /**
     * Track the render state of the Application
     * @see {Application.RENDER_STATES}
     */
    _state: ApplicationRenderState;

    /** Track the most recent scroll positions for any vertically scrolling containers */
    protected _scrollPositions: Record<string, unknown> | null;

    /**
     * The application ID is a unique incrementing integer which is used to identify every application window
     * drawn by the VTT
     */
    appId: number;

    protected static _warnedAppV1: boolean;

    static readonly RENDER_STATES: {
        CLOSING: -2;
        CLOSED: -1;
        NONE: 0;
        RENDERING: 1;
        RENDERED: 2;
        ERROR: 3;
    };

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @return An array of DragDrop handlers
     */
    protected _createDragDropHandlers(): DragDrop[];

    /**
     * Create tabbed navigation handlers for this Application
     * @return An array of Tabs handlers
     */
    protected _createTabHandlers(): Tabs[];

    /**
     * Assign the default options which are supported by all Application classes.
     * Application subclasses may include additional options which are specific to their usage.
     * All keys are optional, descriptions and default values are listed below:
     */
    static get defaultOptions(): ApplicationV1Options;

    /**
     * Return the CSS application ID which uniquely references this UI element
     */
    get id(): string;

    /**
     * Return the active application element, if it currently exists in the DOM
     */
    get element(): JQuery;

    /**
     * The path to the HTML template file which should be used to render the inner content of the app
     */
    get template(): string;

    /**
     * Control the rendering style of the application. If popOut is true, the application is rendered in its own
     * wrapper window, otherwise only the inner app content is rendered
     */
    get popOut(): boolean;

    /**
     * Return a flag for whether the Application instance is currently rendered
     */
    get rendered(): boolean;

    /** Whether the Application is currently closing. */
    get closing(): boolean;

    /**
     * An Application window should define its own title definition logic which may be dynamic depending on its data
     */
    get title(): string;

    /* -------------------------------------------- */
    /* Application rendering                        */
    /* -------------------------------------------- */

    /**
     * An application should define the data object used to render its template.
     * This function may either return an Object directly, or a Promise which resolves to an Object
     * If undefined, the default implementation will return an empty object allowing only for rendering of static HTML
     */
    getData(options?: Partial<ApplicationV1Options>): object | Promise<object>;

    /**
     * Render the Application by evaluating it's HTML template against the object of data provided by the getData method
     * If the Application is rendered as a pop-out window, wrap the contained HTML in an outer frame with window controls
     *
     * @param force   Add the rendered application to the DOM if it is not already present. If false, the
     *                Application will only be re-rendered if it is already present.
     * @param options Additional rendering options which are applied to customize the way that the Application
     *                is rendered in the DOM.
     * @returns The rendered Application instance
     */
    render(force?: boolean, options?: AppV1RenderOptions): this;

    /**
     * An asynchronous inner function which handles the rendering of the Application
     * @param force   Render and display the application even if it is not currently displayed.
     * @param options Provided rendering options, see the render function for details
     * @return A Promise that resolves to the Application once rendering is complete
     */
    protected _render(force?: boolean, options?: AppV1RenderOptions): Promise<void>;

    /**
     * Persist the scroll positions of containers within the app before re-rendering the content
     */
    protected _saveScrollPositions(html: HTMLElement | JQuery): void;

    /**
     * Restore the scroll positions of containers within the app after re-rendering the content
     */
    protected _restoreScrollPositions(html: HTMLElement | JQuery): void;

    /**
     * Render the outer application wrapper
     * @return  A promise resolving to the constructed jQuery object
     */
    protected _renderOuter(options: AppV1RenderOptions): Promise<JQuery>;

    /**
     * Render the inner application content
     * @param data  The data used to render the inner template
     * @return      A promise resolving to the constructed jQuery object
     */
    protected _renderInner(data: object, options: AppV1RenderOptions): Promise<JQuery>;

    /**
     * Customize how inner HTML is replaced when the application is refreshed
     * @param element   The original HTML element
     * @param html      New updated HTML
     */
    protected _replaceHTML(element: JQuery, html: JQuery | HTMLElement, options: Record<string, unknown>): void;

    /**
     * Customize how a new HTML Application is added and first appears in the DOC
     */
    protected _injectHTML(html: JQuery): void;

    /**
     * Specify the set of config buttons which should appear in the Application header.
     * Buttons should be returned as an Array of objects.
     * The header buttons which are added to the application can be modified by the getApplicationHeaderButtons hook.
     * @fires Application#hook:getApplicationHeaderButtons
     */
    protected _getHeaderButtons(): ApplicationV1HeaderButton[];

    /* -------------------------------------------- */
    /* Event Listeners and Handlers                 */
    /* -------------------------------------------- */

    /**
     * Activate required listeners which must be enabled on every Application.
     * These are internal interactions which should not be overridden by downstream subclasses.
     */
    protected _activateCoreListeners(html: JQuery): void;

    /**
     * After rendering, activate event listeners which provide interactivity for the Application.
     * This is where user-defined Application subclasses should attach their event-handling logic.
     */
    activateListeners(html: JQuery): void;

    /**
     * Handle changes to the active tab in a configured Tabs controller
     * @param event     A left click event
     * @param tabs      The TabsV2 controller
     * @param active    The new active tab name
     */
    protected _onChangeTab(event: PointerEvent, tabs: Tabs, active: string): void;

    /**
     * Handle changes to search filtering controllers which are bound to the Application
     * @param event The key-up event from keyboard input
     * @param query The raw string input to the search field
     * @param rgx   The regular expression to test against
     * @param html  The HTML element which should be filtered
     */
    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement | null): void;

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param selector  The candidate HTML selector for dragging
     * @return Can the current user drag this selector?
     */
    protected _canDragStart(selector: string): boolean;

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param selector  The candidate HTML selector for the drop target
     * @return Can the current user drop on this selector?
     */
    protected _canDragDrop(selector: string): boolean;

    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param event The originating DragEvent
     */
    protected _onDragStart(event: DragEvent): void;

    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param event The originating DragEvent
     */
    protected _onDragOver(event: DragEvent): void;

    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param event The originating DragEvent
     */
    protected _onDrop(event: DragEvent): void;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Close the application and un-register references to it within UI mappings
     * This function returns a Promise which resolves once the window closing animation concludes
     * @fires closeApplication
     * @param options Options which affect how the Application is closed
     * @returns A Promise which resolves once the application is closed
     */
    close(options?: { force?: boolean }): Promise<void>;

    /**
     * Minimize the pop-out window, collapsing it to a small tab
     * Take no action for applications which are not of the pop-out variety or apps which are already minimized
     * @return  A Promise which resolves to true once the minimization action has completed
     */
    minimize(): Promise<boolean>;

    /**
     * Maximize the pop-out window, expanding it to its original size
     * Take no action for applications which are not of the pop-out variety or are already maximized
     * @return  A Promise which resolves to true once the maximization action has completed
     */
    maximize(): Promise<boolean>;

    /** Bring the application to the top of the rendering stack */
    bringToTop(): void;

    /** Set the application position and store it's new location */
    setPosition(options?: ApplicationPosition): ApplicationPosition | void;

    /**
     * Handle application minimization behavior - collapsing content and reducing the size of the header
     */
    protected _onToggleMinimize(ev: Event | JQuery.Event): void;

    /**
     * Additional actions to take when the application window is resized
     */
    protected _onResize(event: Event | JQuery.Event): void;
}

interface ApplicationPosition {
    width?: Maybe<number>;
    height?: Maybe<string | number>;
    left?: Maybe<number>;
    top?: Maybe<number>;
    scale?: Maybe<number>;
    zIndex?: Maybe<number>;
}

type ApplicationRenderState = (typeof Application.RENDER_STATES)[keyof typeof Application.RENDER_STATES];
