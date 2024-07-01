/** A Token Configuration Application */
declare class TokenConfig<
    TDocument extends TokenDocument,
    TOptions extends DocumentSheetOptions = DocumentSheetOptions,
> extends DocumentSheet<TDocument, TOptions> {
    constructor(object: TDocument, options?: Partial<DocumentSheetOptions>);

    /** The placed Token object in the Scene */
    token: TDocument;

    /** A reference to the Actor which the token depicts */
    actor: TDocument["actor"];

    static override get defaultOptions(): DocumentSheetOptions;

    /** A convenience accessor to test whether we are configuring the prototype Token for an Actor. */
    get isPrototype(): boolean;

    override get id(): string;

    override get title(): string;

    override render(force?: boolean, options?: RenderOptions): this;

    protected override _render(force?: boolean, options?: RenderOptions): Promise<void>;

    /** Handle preview with a token. */
    protected _handleTokenPreview(force: boolean, options?: Record<string, unknown>): Promise<void>;

    protected override _canUserView(user: User): boolean;

    override getData(options?: Partial<TOptions>): Promise<TokenConfigData<TDocument>>;

    protected override _renderInner(data: DocumentSheetData<TDocument>, options: RenderOptions): Promise<JQuery>;

    /** Get an Object of image paths and filenames to display in the Token sheet */
    protected _getAlternateTokenImages(): Promise<Record<string, ImageFilePath | VideoFilePath>>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners(html: JQuery): void;

    override close(options?: { force?: boolean }): Promise<void>;

    protected override _getSubmitData(updateData?: Record<string, unknown> | null): Record<string, unknown>;

    protected override _onChangeInput(event: Event): Promise<void>;

    /**
     * Mimic changes to the Token document as if they were true document updates.
     * @param change        Data which simulates a document update
     * @param [reset=false] To know if this preview change is a reset
     */
    protected _previewChanges(change: Record<string, unknown>, reset?: boolean): void;

    /** Reset the temporary preview of the Token when the form is submitted or closed. */
    protected _resetPreview(): void;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

    /**
     * Handle Token assignment requests to update the default prototype Token
     * @param The left-click event on the assign token button
     */
    protected _onAssignToken(event: MouseEvent): Promise<void>;

    /** Handle changing the attribute bar in the drop-down selector to update the default current and max value */
    protected _onBarChange(event: Event): void;

    /**
     * Handle click events on a token configuration sheet action button
     * @param event The originating click event
     */
    protected _onClickActionButton(event: PointerEvent): void;

    /**
     * Handle adding a detection mode.
     * @param modes The existing detection modes.
     */
    protected _onAddDetectionMode(modes: TokenDetectionMode): void;

    /**
     * Handle removing a detection mode.
     * @param index The index of the detection mode to remove.
     * @param modes The existing detection modes.
     */
    protected _onRemoveDetectionMode(index: number, modes: TokenDetectionMode[]): void;
}

declare interface TokenConfigData<TDocument extends TokenDocument> extends DocumentSheetData<TDocument> {
    cssClasses: string;
    isPrototype: boolean;
    hasAlternates: boolean;
    alternateImages: string[];
    object: TDocument;
    options: DocumentSheetOptions;
    gridUnits: string;
    barAttributes: string[];
    bar1: string;
    bar2: string;
    displayModes: Record<string, string>;
    actors: TDocument["actor"][];
    dispositions: Record<string, string>;
    isGM: boolean;
}
