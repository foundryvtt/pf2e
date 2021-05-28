declare interface TokenConfigData<T extends TokenDocument | Token> extends FormApplicationData {
    cssClasses: string;
    isPrototype: boolean;
    hasAlternates: boolean;
    alternateImages: string[];
    object: T;
    options: FormApplicationOptions;
    gridUnits: string;
    barAttributes: string[];
    bar1: string;
    bar2: string;
    displayModes: Record<string, string>;
    actors: T['actor'][];
    dispositions: Record<string, string>;
    isGM: boolean;
}

/** A Token Configuration Application */
declare class TokenConfig<
    TObject extends TokenDocument | Token = TokenDocument | Token,
> extends FormApplication<TObject> {
    constructor(object: TObject, options?: FormApplicationOptions);

    /** @inheritdoc */
    static get defaultOptions(): FormApplicationOptions;

    /** @inheritdoc */
    get id(): `token-config-${string}`;

    /** A convenience accessor to test whether we are configuring the prototype Token for an Actor. */
    get isPrototype(): boolean;

    /** Convenience access to the Actor document that this Token represents */
    get actor(): TObject['actor'];

    get title(): string;

    getData(options?: FormApplicationOptions): TokenConfigData<TObject>;

    /** @inheritdoc */
    render(force?: boolean, options?: RenderOptions): this;

    /**
     * Get an Object of image paths and filenames to display in the Token sheet
     */
    protected _getAlternateTokenImages(): Promise<Record<string, string>>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** @inheritdoc */
    activateListeners(html: JQuery): void;

    /** @inheritdoc */
    protected _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown>;

    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<TObject | TObject['parent']>;

    /**
     * Handle Token assignment requests to update the default prototype Token
     * @param The left-click event on the assign token button
     */
    protected _onAssignToken(event: MouseEvent): Promise<void>;

    /** Handle changing the attribute bar in the drop-down selector to update the default current and max value */
    protected _onBarChange(event: Event): void;
}
