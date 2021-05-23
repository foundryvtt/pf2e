declare interface ActorSheetData<TActor extends Actor> extends BaseEntitySheetData<TActor> {
    actor: any;
    data: any;
    items: any[];
    // actor: D;
    // data: D['data'];
    // items: D['items'];
}

/**
 * The default Actor Sheet
 *
 * This Application is responsible for rendering an actor's attributes and allowing the actor to be edited.
 *
 * System modifications may elect to override this class to better suit their own game system by re-defining the value
 * ``CONFIG.Actor.sheetClass``.
 *
 * @param actor            The Actor instance being displayed within the sheet.
 * @param options          Additional options which modify the rendering of the Actor's sheet.
 * @param options.editable Is the Actor editable? Default is true.
 */
declare class ActorSheet<TActor extends Actor, TItem extends Item> extends BaseEntitySheet<TActor> {
    /** @override */
    constructor(actor: TActor, options?: Partial<BaseEntitySheetOptions>);

    /** @override */
    static get defaultOptions(): BaseEntitySheetOptions;

    /**
     * If this Actor Sheet represents a synthetic Token actor, reference the active Token
     */
    token: Token<TActor> | null;

    /** @override */
    get id(): `actor-${string}` | `actor-${string}-${string}`;

    /** @override */
    get title(): string;

    /**
     * A convenience reference to the Actor entity
     */
    get actor(): TActor;

    /**
     * Prepare data for rendering the Actor sheet
     * The prepared data object contains both the actor data as well as additional sheet options
     */
    getData(): ActorSheetData<TActor>;

    /**
     * Handle requests to configure the prototype Token for the Actor
     */
    protected _onConfigureToken(event: Event): void;

    /**
     * Handle requests to configure the default sheet used by this Actor
     */
    protected _onConfigureSheet(event: Event): void;

    /**
     * Handle changing the actor profile image by opening a FilePicker
     */
    protected _onEditImage(event: Event): void;

    /**
     * Allow the Actor sheet to be a displayed as a valid drop-zone
     */
    protected _onDragOver(event: ElementDragEvent): boolean;

    /**
     * Handle dropped data on the Actor sheet
     */
    protected _onDrop(event: ElementDragEvent): Promise<unknown>;

    /**
     * Handle dropping of an item reference or item data onto an Actor Sheet
     * @param event The concluding DragEvent which contains drop data
     * @param data  The data transfer extracted from the event
     * @return A data object which describes the result of the drop
     */
    protected _onDropItem(event: ElementDragEvent, data: DropCanvasData): Promise<unknown>;

    /**
     * Handle the final creation of dropped Item data on the Actor.
     * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
     * @param itemData     The item data requested for creation
     * @private
     */
    protected _onDropItemCreate(itemData: TItem['data']): Promise<TItem[]>;

    /* -------------------------------------------- */
    /*  Owned Item Sorting
    /* -------------------------------------------- */

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     */
    protected _onSortItem(event: ElementDragEvent, itemData: TItem['data']): Promise<TItem[]>;
}
