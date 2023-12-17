/**
 * The default Item Sheet
 *
 * This Application is responsible for rendering an item's attributes and allowing the item to be edited.
 *
 * System modifications may elect to override this class to better suit their own game system by re-defining the value
 * ``CONFIG.Item.sheetClass``.

 * @param item      The Item instance being displayed within the sheet.
 * @param [options] Additional options which modify the rendering of the item.
 */
declare class ItemSheet<TItem extends Item, TOptions extends DocumentSheetOptions> extends DocumentSheet<
    TItem,
    TOptions
> {
    constructor(item: TItem, options?: Partial<TOptions>);

    static override get defaultOptions(): DocumentSheetOptions;

    override get id(): string;

    /**
     * A convenience reference to the Item entity
     */
    get item(): TItem;

    /** The Actor instance which owns this item. This may be null if the item is unowned. */
    get actor(): TItem["parent"];

    override getData(option?: Partial<TOptions>): ItemSheetData<TItem> | Promise<ItemSheetData<TItem>>;

    /**
     * Activate listeners which provide interactivity for item sheet events
     * @param html The HTML object returned by template rendering
     */
    override activateListeners(html: JQuery): void;
}

declare interface ItemSheetData<TItem extends Item> extends DocumentSheetData<TItem> {
    item: TItem;
    data: object;
}
