declare interface ItemSheetData<D extends BaseItemData> extends BaseEntitySheetData<D> {
    item: D;
    data: D['data'];
}

/**
 * The default Item Sheet
 *
 * This Application is responsible for rendering an item's attributes and allowing the item to be edited.
 *
 * System modifications may elect to override this class to better suit their own game system by re-defining the value
 * ``CONFIG.Item.sheetClass``.
 *
 * @param item              The Item instance being displayed within the sheet.
 * @param options           Additional options which modify the rendering of the item.
 * @param options.editable  Is the item editable? Default is true.
 */
declare class ItemSheet<ItemType extends Item = Item> extends BaseEntitySheet<ItemType> {
    /** @override */
    static get defaultOptions(): BaseEntitySheetOptions;

    /**
     * A convenience reference to the Item entity
     */
    get item(): ItemType;

    /**
     * The Actor instance which owns this item. This may be null if the item is unowned.
     */
    get actor(): ItemType['actor'];

    /** @override */
    getData(): ItemSheetData<ItemType['data']>;

    /**
     * Activate listeners which provide interactivity for item sheet events
     * @param html The HTML object returned by template rendering
     */
    activateListeners(html: JQuery): void;
}
