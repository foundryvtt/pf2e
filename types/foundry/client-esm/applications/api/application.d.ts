import type {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationFormConfiguration,
    ApplicationHeaderControlsEntry,
    ApplicationRenderContext,
    ApplicationRenderOptions,
} from "../_types.d.ts";

/** The Application class is responsible for rendering an HTMLElement into the Foundry Virtual Tabletop user interface. */
export default abstract class ApplicationV2<
    TConfig extends ApplicationConfiguration = ApplicationConfiguration,
    TRenderOptions extends ApplicationRenderOptions = ApplicationRenderOptions,
> {
    constructor(options?: DeepPartial<TConfig>);

    /**
     * Designates which upstream Application class in this class' inheritance chain is the base application.
     * Any DEFAULT_OPTIONS of super-classes further upstream of the BASE_APPLICATION are ignored.
     * Hook events for super-classes further upstream of the BASE_APPLICATION are not dispatched.
     */
    static BASE_APPLICATION: ApplicationV2;

    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static RENDER_STATES: {
        ERROR: -3;
        CLOSING: -2;
        CLOSED: -1;
        NONE: 0;
        RENDERING: 1;
        RENDERED: 2;
    };

    static emittedEvents: readonly string[];

    options: TConfig;

    /** Convenience references to window header elements. */
    get window(): {
        header: HTMLElement;
        title: HTMLHeadingElement;
        icon: HTMLElement;
        close: HTMLButtonElement;
        controls: HTMLButtonElement;
        controlsDropdown: HTMLDivElement;
        onDrag: (event: DragEvent) => void;
        onResize: (event: DragEvent) => void;
        pointerStartPosition: ApplicationPosition;
        pointerMoveThrottle: boolean;
    };

    /**
     * If this Application uses tabbed navigation groups, this mapping is updated whenever the changeTab method is called.
     * Reports the active tab for each group.
     * Subclasses may override this property to define default tabs for each group.
     */
    tabGroups: Record<string, string>;

    /* -------------------------------------------- */
    /*  Application Properties                      */
    /* -------------------------------------------- */

    /** The CSS class list of this Application instance */
    get classList(): DOMTokenList;

    /** The HTML element ID of this Application instance. */
    get id(): string;

    /** A convenience reference to the title of the Application window. */
    get title(): string;

    /** The HTMLElement which renders this Application into the DOM. */
    get element(): HTMLElement;

    /** Is this Application instance currently minimized? */
    get minimized(): boolean;

    /** The current position of the application with respect to the window.document.body. */
    position: ApplicationPosition;

    /** Is this Application instance currently rendered? */
    get rendered(): boolean;

    /** The current render state of the Application. */
    get state(): number;

    /** Does this Application instance render within an outer window frame? */
    get hasFrame(): boolean;

    /* -------------------------------------------- */
    /*  Initialization                              */
    /* -------------------------------------------- */

    /**
     * Iterate over the inheritance chain of this Application.
     * The chain includes this Application itself and all parents until the base application is encountered.
     * @see ApplicationV2.BASE_APPLICATION
     */
    static inheritanceChain(): Generator<ApplicationV2>;

    /**
     * Initialize configuration options for the Application instance.
     * The default behavior of this method is to intelligently merge options for each class with those of their parents.
     * - Array-based options are concatenated
     * - Inner objects are merged
     * - Otherwise, properties in the subclass replace those defined by a parent
     * @param options      Options provided directly to the constructor
     * @returns Configured options for the application instance
     */
    protected _initializeApplicationOptions(options: Partial<TConfig>): TConfig;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Render the Application, creating its HTMLElement and replacing its innerHTML.
     * Add it to the DOM if it is not currently rendered and rendering is forced. Otherwise, re-render its contents.
     * @param options       Options which configure application rendering behavior.
     *                      A boolean is interpreted as the "force" option.
     * @param _options      Legacy options for backwards-compatibility with the original
     *                      ApplicationV1#render signature.
     * @returns A Promise which resolves to the rendered Application instance
     */
    render(options?: boolean | TRenderOptions, _options?: TRenderOptions): Promise<ApplicationV2>;

    /**
     * Modify the provided options passed to a render request.
     * @param options                 Options which configure application rendering behavior
     */
    protected _configureRenderOptions(options: TRenderOptions): void;

    /**
     * Prepare application rendering context data for a given render request.
     * @param options  Options which configure application rendering behavior
     * @returns Context data for the render operation
     */
    protected _prepareContext(options: TRenderOptions): Promise<object>;

    /**
     * Configure the array of header control menu options
     * @returns
     */
    protected _getHeaderControls(): ApplicationHeaderControlsEntry[];

    /**
     * Render an HTMLElement for the Application.
     * An Application subclass must implement this method in order for the Application to be renderable.
     * @param context      Context data for the render operation
     * @param options      Options which configure application rendering behavior
     * @returns            The result of HTML rendering may be implementation specific.
     *                     Whatever value is returned here is passed to _replaceHTML
     */
    protected abstract _renderHTML(context: ApplicationRenderContext, options: TRenderOptions): Promise<unknown>;

    /**
     * Replace the HTML of the application with the result provided by the rendering backend.
     * An Application subclass should implement this method in order for the Application to be renderable.
     * @param result                  The result returned by the application rendering backend
     * @param content                 The content element into which the rendered result must be inserted
     * @param options                 Options which configure application rendering behavior
     */
    protected abstract _replaceHTML(result: unknown, content: HTMLElement, options: TRenderOptions): void;

    /**
     * Render the outer framing HTMLElement which wraps the inner HTML of the Application.
     * @param options                 Options which configure application rendering behavior
     */
    protected _renderFrame(options: TRenderOptions): Promise<HTMLElement>;

    /** Render a header control button. */
    protected _renderHeaderControl(control: ApplicationHeaderControlsEntry): HTMLLIElement;

    /**
     * When the Application is rendered, optionally update aspects of the window frame.
     * @param options               Options provided at render-time
     */
    protected _updateFrame(options: TRenderOptions): void;

    /**
     * Insert the application HTML element into the DOM.
     * Subclasses may override this method to customize how the application is inserted.
     * @param element                 The element to insert
     * @returns The inserted element
     */
    protected _insertElement(element: HTMLElement): HTMLElement;

    /* -------------------------------------------- */
    /*  Closing                                     */
    /* -------------------------------------------- */

    /**
     * Close the Application, removing it from the DOM.
     * @param options Options which modify how the application is closed.
     * @returns A Promise which resolves to the closed Application instance
     */
    close(options?: ApplicationClosingOptions): Promise<ApplicationV2>;

    /**
     * Remove the application HTML element from the DOM.
     * Subclasses may override this method to customize how the application element is removed.
     * @param element                 The element to be removed
     */
    protected _removeElement(element: HTMLElement): void;

    /* -------------------------------------------- */
    /*  Positioning                                 */
    /* -------------------------------------------- */

    /**
     * Update the Application element position using provided data which is merged with the prior position.
     * @param position New Application positioning data
     * @returns The updated application position
     */
    setPosition(position?: Partial<ApplicationPosition>): ApplicationPosition;

    /* -------------------------------------------- */

    /**
     * Translate a requested application position updated into a resolved allowed position for the Application.
     * Subclasses may override this method to implement more advanced positioning behavior.
     * @param position        Requested Application positioning data
     * @returns               Resolved Application positioning data
     */
    protected _updatePosition(position: ApplicationPosition): ApplicationPosition;

    /* -------------------------------------------- */
    /*  Other Public Methods                        */
    /* -------------------------------------------- */

    /**
     * Toggle display of the Application controls menu.
     * Only applicable to window Applications.
     * @param expanded      Set the controls visibility to a specific state.
     *                      Otherwise, the visible state is toggled from its current value
     */
    toggleControls(expanded?: boolean): void;

    /** Minimize the Application, collapsing it to a minimal header. */
    minimize(): Promise<void>;

    /** Restore the Application to its original dimensions. */
    maximize(): Promise<void>;

    /**
     * Bring this Application window to the front of the rendering stack by increasing its z-index.
     * Once ApplicationV1 is deprecated we should switch from _maxZ to ApplicationV2#maxZ
     * We should also eliminate ui.activeWindow in favor of only ApplicationV2#frontApp
     */
    bringToFront(): void;

    /**
     * Change the active tab within a tab group in this Application instance.
     * @param tab        The name of the tab which should become active
     * @param group      The name of the tab group which defines the set of tabs
     * @param [options]  Additional options which affect tab navigation
     * @param [options.event]                 An interaction event which caused the tab change, if any
     * @param [options.navElement]      An explicit navigation element being modified
     * @param [options.force=false]         Force changing the tab even if the new tab is already active
     * @param [options.updatePosition=true] Update application position after changing the tab?
     */
    changeTab(
        tab: string,
        group: string,
        options?: { event?: Event; navElement?: HTMLElement; force?: boolean; updatePosition?: boolean },
    ): void;

    /* -------------------------------------------- */
    /*  Rendering Life-Cycle Methods                */
    /* -------------------------------------------- */

    /**
     * Test whether this Application is allowed to be rendered.
     * @param options                 Provided render options
     * @returns                       Return false to prevent rendering
     * @throws {Error}                An Error to display a warning message
     */
    protected _canRender(options: TRenderOptions): false | void;

    /**
     * Actions performed before a first render of the Application.
     * @param context      Prepared context data
     * @param options      Provided render options
     */
    protected _preFirstRender(context: Record<string, unknown>, options: TRenderOptions): Promise<void>;

    /**
     * Actions performed after a first render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param context      Prepared context data
     * @param  options                 Provided render options
     */
    protected _onFirstRender(context: object, options: TRenderOptions): void;

    /**
     * Actions performed before any render of the Application.
     * Pre-render steps are awaited by the render process.
     * @param context      Prepared context data
     * @param options      Provided render options
     */
    protected _preRender(context: object, options: TRenderOptions): Promise<void>;

    /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param context      Prepared context data
     * @param options      Provided render options
     */
    protected _onRender(context: object, options: TRenderOptions): void;

    /**
     * Actions performed before closing the Application.
     * Pre-close steps are awaited by the close process.
     * @param options Provided render options
     */
    protected _preClose(options: TRenderOptions): Promise<void>;

    /**
     * Actions performed after closing the Application.
     * Post-close steps are not awaited by the close process.
     * @param options Provided render options
     */
    protected _onClose(options: TRenderOptions): void;

    /**
     * Actions performed before the Application is re-positioned.
     * Pre-position steps are not awaited because setPosition is synchronous.
     * @param {ApplicationPosition} position The requested application position
     * @protected
     */
    protected _prePosition(position: ApplicationPosition): void;

    /**
     * Actions performed after the Application is re-positioned.
     * @param position          The requested application position
     */
    protected _onPosition(position: ApplicationPosition): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Attach event listeners to the Application frame. */
    protected _attachFrameListeners(): void;

    /**
     * A generic event handler for action clicks which can be extended by subclasses.
     * Action handlers defined in DEFAULT_OPTIONS are called first. This method is only called for actions which have
     * no defined handler.
     * @param event      The originating click event
     * @param target     The capturing HTML element which defined a [data-action]
     */
    protected _onClickAction(event: PointerEvent, target: HTMLElement): void;

    /**
     * Handle submission for an Application which uses the form element.
     * @param formConfig     The form configuration for which this handler is bound
     * @param event          The form submission event
     */
    protected _onSubmitForm(formConfig: ApplicationFormConfiguration, event: Event | SubmitEvent): Promise<void>;

    /**
     * Handle changes to an input element within the form.
     * @param formConfig     The form configuration for which this handler is bound
     * @param event          An input change event within the form
     */
    _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    /**
     * Parse a CSS style rule into a number of pixels which apply to that dimension.
     * @param style            The CSS style rule
     * @param parentDimension  The relevant dimension of the parent element
     * @returns The parsed style dimension in pixels
     */
    static parseCSSDimension(style: string, parentDimension: number): number;

    /**
     * Wait for a CSS transition to complete for an element.
     * @param element  The element which is transitioning
     * @param  timeout A timeout in milliseconds in case the transitionend event does not occur
     */
    protected _awaitTransition(element: HTMLElement, timeout: number): Promise<void>;
}
