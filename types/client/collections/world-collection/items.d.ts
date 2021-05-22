/**
 * The Collection of Item entities
 * The items collection is accessible within the game as game.items
 */
declare class Items<ItemType extends Item> extends EntityCollection<ItemType> {
    get documentName(): 'Item';

    /* -------------------------------------------- */
    /*  Collection Properties                       */
    /* -------------------------------------------- */

    /** @override */
    get entity(): 'Item';

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    /**
     * Register an Item sheet class as a candidate which can be used to display Items of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    static registerSheet(
        scope: string,
        sheetClass: new (...args: any) => ItemSheet,
        options?: RegisterSheetOptions,
    ): void;

    /**
     * Unregister an Item sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     */
    static unregisterSheet(scope: string, sheetClass: typeof ItemSheet): void;

    /**
     * Return an Array of currently registered sheet classes for this Entity type
     */
    static get registeredSheets(): typeof ItemSheet[];
}
