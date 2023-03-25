export enum ItemSortDirection {
    Ascending = "ascending",
    Descending = "descending",
    Unsorted = "unsorted",
}

export enum ItemSortCategory {
    ItemName = "item-name",
    ItemSellValue = "item-sell-value",
    ItemQuantity = "item-quantity",
    ItemWeight = "item-weight",
    None = "none",
}

export interface ItemSortData {
    direction: ItemSortDirection;
    category?: ItemSortCategory;
}
