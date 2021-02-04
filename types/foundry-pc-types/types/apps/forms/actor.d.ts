declare interface ActorSheetData<A extends Actor, I extends Item> extends BaseEntitySheetData<A> {
    actor: A;
    data: A['data'];
    items: I[];
}

/**
 * The default Actor Sheet
 *
 * This Application is responsible for rendering an actor's attributes and allowing the actor to be edited.
 *
 * System modifications may elect to override this class to better suit their own game system by re-defining the value
 * ``CONFIG.Actor.sheetClass``.
 *
 * @param actor				The Actor instance being displayed within the sheet.
 * @param options			Additional options which modify the rendering of the Actor's sheet.
 * @param options.editable	Is the Actor editable? Default is true.
 */
declare class ActorSheet<ActorType extends Actor, ItemType extends Item> extends BaseEntitySheet<ActorType> {
    /**
     * If this Actor Sheet represents a synthetic Token actor, reference the active Token
     */
    token: Token<ActorType>;

    /**
     * A convenience reference to the Actor entity
     */
    get actor(): ActorType;

    /**
     * Prepare data for rendering the Actor sheet
     * The prepared data object contains both the actor data as well as additional sheet options
     */
    getData(): ActorSheetData<ActorType, ItemType>;

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
     * Default handler for beginning a drag-drop workflow of an Owned Item on an Actor Sheet
     */
    protected _onDragItemStart(event: DragEvent): boolean;

    /**
     * Allow the Actor sheet to be a displayed as a valid drop-zone
     */
    protected _onDragOver(event: DragEvent): boolean;

    /**
     * Handle dropped data on the Actor sheet
     */
    protected _onDrop(event: DragEvent): Promise<boolean | any>;

    /**
     * Handle the final creation of dropped Item data on the Actor.
     * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
     * @param itemData     The item data requested for creation
     * @private
     */
    protected _onDropItemCreate(itemData: ItemType['data']): Promise<ItemType['data']>;

    /* -------------------------------------------- */
    /*  Owned Item Sorting
    /* -------------------------------------------- */

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     */
    protected _onSortItem(event: Event, itemData: ItemType['data']): Promise<ItemType>;

    protected _getSortSiblings(source: any): any;
}
