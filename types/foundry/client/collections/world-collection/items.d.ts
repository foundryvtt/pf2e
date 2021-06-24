/**
 * The Collection of Item documents which exist within the active World.
 * This Collection is accessible within the Game object as game.items.
 * @see {@link Item} The Item entity
 * @see {@link ItemDirectory} The ItemDirectory sidebar directory
 */
declare class Items<TItem extends Item> extends WorldCollection<TItem> {
    /** @override */
    static documentName: 'Item';

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Register an Item sheet class as a candidate which can be used to display Actors of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    static registerSheet(
        scope: string,
        sheetClass: new (...args: any[]) => ItemSheet,
        options?: RegisterSheetOptions,
    ): void;

    /**
     * Unregister an Item sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     */
    static unregisterSheet(scope: string, sheetClass: new (...args: any[]) => ItemSheet, types?: string[]): void;

    /**
     * Return an Array of currently registered sheet classes for this Entity type
     */
    static get registeredSheets(): ItemSheet[];
}
