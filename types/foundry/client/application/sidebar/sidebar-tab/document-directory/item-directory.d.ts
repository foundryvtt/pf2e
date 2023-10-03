export {};

declare global {
    /** The sidebar directory which organizes and displays world-level Item documents. */
    class ItemDirectory<TItem extends Item<null>> extends DocumentDirectory<TItem> {
        static override documentName: "Item";

        protected override _canDragDrop(selector: string): boolean;

        protected override _getEntryContextOptions(): EntryContextOption[];
    }
}
