/** An interface for displaying the content of a CompendiumCollection. */
declare class Compendium<TDocument extends CompendiumDocument> extends Application {
    constructor(collection: CompendiumCollection<TDocument>, options: ApplicationOptions);

    /** The CompendiumCollection instance which is represented in this Compendium interface. */
    collection: CompendiumCollection<TDocument>;

    static get defaultOptions(): Required<ApplicationOptions>;

    get title(): string;

    /** A convenience redirection back to the metadata object of the associated CompendiumCollection */
    get metadata(): CompendiumMetadata<TDocument>;

    /* ----------------------------------------- */
    /*  Rendering                                */
    /* ----------------------------------------- */

    getData(options: ApplicationOptions): ApplicationOptions;

    close(options?: { force?: boolean }): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    activateListeners(html: JQuery): void;

    /**
     * Handle opening a single compendium entry by invoking the configured entity class and its sheet
     * @param event The originating click event
     */
    protected _onClickEntry(event: MouseEvent): void;

    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;

    protected _canDragStart(selector: string): boolean;

    protected _canDragDrop(selector: string): boolean;

    protected _onDragStart(event: DragEvent): void;

    protected _onDrop(event: DragEvent): Promise<boolean>;

    /** Render the ContextMenu which applies to each compendium Document */
    protected _contextMenu(html: JQuery): void;
}
