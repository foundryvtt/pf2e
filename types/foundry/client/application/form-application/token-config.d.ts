/** A Token Configuration Application */
declare class TokenConfig<
    TDocument extends TokenDocument = TokenDocument,
    TOptions extends FormApplicationOptions = FormApplicationOptions
> extends FormApplication<TDocument, TOptions> {
    constructor(object: TDocument, options?: Partial<FormApplicationOptions>);

    token: TDocument;

    static override get defaultOptions(): FormApplicationOptions;

    override get id(): `token-config-${string}`;

    /** A convenience accessor to test whether we are configuring the prototype Token for an Actor. */
    get isPrototype(): boolean;

    /** Convenience access to the Actor document that this Token represents */
    get actor(): TDocument["actor"];

    get title(): string;

    override getData(options?: Partial<TOptions>): TokenConfigData<TDocument> | Promise<TokenConfigData<TDocument>>;

    override render(force?: boolean, options?: RenderOptions): Promise<this>;

    /** Get an Object of image paths and filenames to display in the Token sheet */
    protected _getAlternateTokenImages(): Promise<Record<string, string>>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners(html: JQuery): void;

    protected override _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown>;

    protected override _updateObject(
        event: Event,
        formData: Record<string, unknown>
    ): Promise<TDocument | TDocument["actor"]>;

    /**
     * Handle Token assignment requests to update the default prototype Token
     * @param The left-click event on the assign token button
     */
    protected _onAssignToken(event: MouseEvent): Promise<void>;

    /** Handle changing the attribute bar in the drop-down selector to update the default current and max value */
    protected _onBarChange(event: Event): void;
}

declare interface TokenConfigData<T extends TokenDocument> extends FormApplicationData<T> {
    cssClasses: string;
    isPrototype: boolean;
    hasAlternates: boolean;
    alternateImages: string[];
    object: T["data"];
    options: Partial<FormApplicationOptions>;
    gridUnits: string;
    barAttributes: string[];
    bar1: string;
    bar2: string;
    displayModes: Record<string, string>;
    actors: T["actor"][];
    dispositions: Record<string, string>;
    isGM: boolean;
}
