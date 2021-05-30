declare interface ItemSheetData<I extends Item> extends DocumentSheetData<I> {
    item: any;
    data: any;
}

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
declare class ItemSheet<ItemType extends Item = Item> extends DocumentSheet<ItemType> {
    /** @override */
    constructor(item: ItemType, options?: Partial<DocumentSheetOptions>);

    /** @override */
    static get defaultOptions(): DocumentSheetOptions;

    /** @override */
    get id(): `item-${string}` | `actor-${string}-item-{string}`;

    /**
     * A convenience reference to the Item entity
     */
    get item(): ItemType;

    /** The Actor instance which owns this item. This may be null if the item is unowned. */
    get actor(): ItemType['parent'];

    /** @override */
    getData(option?: this['options']): ItemSheetData<ItemType>;

    /**
     * Activate listeners which provide interactivity for item sheet events
     * @param html The HTML object returned by template rendering
     */
    activateListeners(html: JQuery): void;
}
