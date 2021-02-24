declare interface ActorSheetData<A extends Actor> extends BaseEntitySheetData<A> {
    actor: A;
    data: A['data'];
    items: A['items'];
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
declare class ActorSheet<
    ActorType extends Actor = Actor,
    ItemDataType extends CollectionElement<ActorType['items']>['data'] = CollectionElement<ActorType['items']>['data']
> extends BaseEntitySheet<ActorType> {
    /**
     * If this Actor Sheet represents a synthetic Token actor, reference the active Token
     */
    token: Token<ActorType>;

    /** The _id of the sheet's Actor */
    get id(): string;

    /** @override */
    get title(): string;

    /**
     * A convenience reference to the Actor entity
     */
    get actor(): ActorType;

    /**
     * Prepare data for rendering the Actor sheet
     * The prepared data object contains both the actor data as well as additional sheet options
     */
    getData(): ActorSheetData<ActorType>;

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
    protected _onDragItemStart(event: ElementDragEvent): boolean;

    /**
     * Allow the Actor sheet to be a displayed as a valid drop-zone
     */
    protected _onDragOver(event: ElementDragEvent): boolean;

    /**
     * Handle dropped data on the Actor sheet
     */
    protected _onDrop(event: ElementDragEvent): Promise<boolean | any>;

    /**
     * Handle the final creation of dropped Item data on the Actor.
     * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
     * @param itemData     The item data requested for creation
     * @private
     */
    protected _onDropItemCreate(itemData: ItemDataType): Promise<ItemDataType | null>;

    /* -------------------------------------------- */
    /*  Owned Item Sorting
    /* -------------------------------------------- */

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     */
    protected _onSortItem(
        event: ElementDragEvent,
        itemData: ItemDataType,
    ): Promise<(ItemDataType | null)[] | ItemDataType | null>;
}
