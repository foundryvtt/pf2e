/**
 * The Collection of Item documents which exist within the active World.
 * This Collection is accessible within the Game object as game.items.
 * @see {@link Item} The Item entity
 * @see {@link ItemDirectory} The ItemDirectory sidebar directory
 */
declare class Items<TItem extends Item> extends WorldCollection<TItem> {
    static override documentName: "Item";

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Register an Item sheet class as a candidate which can be used to display Actors of a given type
     * See DocumentSheetConfig.registerSheet for details
     */
    static registerSheet(scope: string, sheetClass: ConstructorOf<ItemSheet>, options?: RegisterSheetOptions): void;

    /**
     * Unregister an Item sheet class, removing it from the list of avaliable sheet Applications to use
     * See DocumentSheetConfig.unregisterSheet for details
     */
    static unregisterSheet(scope: string, sheetClass: ConstructorOf<ItemSheet>, types?: string[]): void;

    /** Return an Array of currently registered sheet classes for this Document type */
    static get registeredSheets(): ItemSheet[];
}
