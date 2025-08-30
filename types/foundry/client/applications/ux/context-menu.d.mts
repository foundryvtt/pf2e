export interface ContextMenuEntry {
    /** The context menu label. Can be localized. */
    name: string;
    /** A string containing an HTML icon element for the menu item. */
    icon?: string;
    /** Additional CSS classes to apply to this menu item. */
    classes?: string;
    /** An identifier for a group this entry belongs to. */
    group?: string;
    /** The function to call when the menu item is clicked. */
    callback: ContextMenuCallback;
    /** A function to call or boolean value to determine if this entry appears in the menu. */
    condition?: ContextMenuCondition | boolean;
}

export type ContextMenuCondition = (html: HTMLElement) => boolean;
export type ContextMenuCallback = (target: HTMLElement) => unknown;

export interface ContextMenuOptions {
    /**
     * Optionally override the triggering event which can spawn the menu. If the menu is using fixed positioning, this
     * event must be a PointerEvent.
     */
    eventName?: string;

    /** A function to call when the context menu is opened. */
    onOpen?: ContextMenuCallback;

    /** A function to call when the context menu is closed. */
    onClose?: ContextMenuCallback;

    /** If true, the context menu is given a fixed position rather than being injected into the target. */
    fixed?: boolean;

    /** If true, callbacks will be passed jQuery objects instead of HTMLElement instances. */
    jQuery: false;
}

export interface ContextMenuRenderOptions {
    /** The event that triggered the context menu opening. */
    event?: Event;
    /** Animate the context menu opening. */
    animate?: boolean;
}

/**
 * Display a right-click activated Context Menu which provides a dropdown menu of options.
 * A ContextMenu is constructed by designating a parent HTML container and a target selector.
 * An Array of menuItems defines the entries of the menu which is displayed.
 */
export default class ContextMenu {
    /**
     * @param container The HTML element that contains the context menu targets.
     * @param selector A CSS selector which activates the context menu.
     * @param menuItems An Array of entries to display in the menu
     * @param options Additional options to configure the context menu.
     */
    constructor(
        container: HTMLElement | JQuery,
        selector: string,
        menuItems: ContextMenuEntry[],
        options: ContextMenuOptions,
    );

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The menu element.
     */
    get element(): HTMLElement;

    /**
     * A CSS selector to identify context menu targets.
     */
    get selector(): string;

    /**
     * The event name to listen for.
     */
    get eventName(): string;

    /**
     * The array of menu items to render.
     */
    menuItems: ContextMenuEntry & { element: HTMLElement };

    /**
     * A function to call when the context menu is opened.
     */
    onOpen: ContextMenuCallback;

    /**
     * A function to call when the context menu is closed.
     */
    onClose: ContextMenuCallback;

    /**
     * Check which direction the menu is expanded in.
     */
    get expandUp(): boolean;

    /**
     * Whether to position the context menu as a fixed element, or inject it into the target.
     */
    get fixed(): boolean;

    /**
     * The parent HTML element to which the context menu is attached
     */
    get target(): HTMLElement;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Animate the context menu's height when opening or closing.
     * @param open Whether the menu is opening or closing.
     * @returns A Promise that resolves when the animation completes.
     */
    protected _animate(open?: boolean): Promise<void>;

    /**
     * Closes the menu and removes it from the DOM.
     * @param options Options to configure the closing behavior.
     * @param options.animate Animate the context menu closing.
     */
    close(options?: { animate?: boolean }): Promise<void>;

    /**
     * Close the menu and remove it from the DOM.
     */
    protected _close(): void;

    /**
     * Called before the context menu begins rendering.
     */
    protected _preRender(target: HTMLElement, options?: ContextMenuRenderOptions): Promise<void>;

    /**
     * Render the Context Menu by iterating over the menuItems it contains.
     * Check the visibility of each menu item, and only render ones which are allowed by the item's logical condition.
     * Attach a click handler to each item which is rendered.
     * @returns A Promise that resolves when the open animation has completed.
     */
    render(target: HTMLElement, options?: ContextMenuRenderOptions): Promise<void>;

    /**
     * Called after the context menu has finished rendering and animating open.
     */
    protected _onRender(options?: ContextMenuRenderOptions): Promise<void>;

    /**
     * Set the position of the context menu, taking into consideration whether the menu should expand upward or downward
     * @param menu          The context menu element.
     * @param target        The element that the context menu was spawned on.
     * @param options.event The event that triggered the context menu opening.
     */
    protected _setPosition(menu: HTMLElement, target: HTMLElement, options?: { event?: Event }): void;

    /**
     * Inject the menu inside the target.
     * @param menu   The menu element.
     * @param target The context target.
     */
    protected _injectMenu(menu: HTMLElement, target: HTMLElement): void;

    /**
     * Set the context menu at a fixed position in the viewport.
     * @param menu   The menu element.
     * @param target The context target.
     * @param options.event The event that triggered the context menu opening.
     */
    protected _setFixedPosition(menu: HTMLElement, target: HTMLElement, options?: { event?: Event }): void;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Local listeners which apply to each ContextMenu instance which is created.
     * @param menu The context menu element.
     */
    activateListeners(menu: HTMLElement): void;

    /**
     * Handle context menu activation.
     * @param event The triggering event.
     */
    protected _onActivate(event: Event): void | Promise<void>;

    /**
     * Global listeners which apply once only to the document.
     */
    static eventListeners(): void;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Retrieve the configured DragDrop implementation.
     */
    static get implementation(): typeof ContextMenu;
}
