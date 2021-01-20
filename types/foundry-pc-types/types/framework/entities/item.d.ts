/**
 * The Collection of Item entities
 * The items collection is accessible within the game as game.items
 */
declare class Items<ItemType extends Item = Item> extends Collection<ItemType> {
    entities: ItemType[];

    values(): IterableIterator<ItemType>;

    /* -------------------------------------------- */
    /*  Collection Properties                       */
    /* -------------------------------------------- */

    static get instance(): Items;

    /**
     * Elements of the Items collection are instances of the Item class, or a subclass thereof
     */
    get object(): ItemType;

    /* -------------------------------------------- */
    /*  Collection Management Methods               */
    /* -------------------------------------------- */

    insert(entity: ItemType): void;

    get<I extends ItemType = ItemType>(id: string, { strict }?: { strict?: boolean }): I | null;

    /**
     * Register an Item sheet class as a candidate which can be used to display Items of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    static registerSheet(...args: any): void;

    /**
     * Unregister an Item sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     */
    static unregisterSheet(...args: any): void;

    /**
     * Return an Array of currently registered sheet classes for this Entity type
     */
    static get registeredSheets(): any[];
}

interface BaseItemData extends BaseEntityData {
    type: string;
}

type _Actor = Actor<Item<_Actor>>;
declare class Item<ActorType extends Actor = _Actor> extends Entity {
    data: BaseItemData;

    /**
     * Configure the attributes of the ChatMessage Entity
     *
     * @returns baseEntity			The parent class which directly inherits from the Entity interface.
     * @returns collection			The Collection class to which Entities of this type belong.
     * @returns embeddedEntities	The names of any Embedded Entities within the Entity data structure.
     */
    static get config(): {
        baseEntity: Item;
        collection: Items;
        embeddedEntities: {};
    };

    /** @override */
    prepareData(): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A convenience reference to the Actor entity which owns this item, if any
     */
    get actor(): ActorType | null;

    /**
     * A convenience reference to the image path (data.img) used to represent this Item
     */
    get img(): string;

    /**
     * A convenience reference to the item type (data.type) of this Item
     */
    get type(): string;

    /**
     * A boolean indicator for whether the current game user has ONLY limited visibility for this Entity.
     */
    get limited(): boolean;

    /**
     * A flag for whether the item is owned by an Actor entity
     */
    get isOwned(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Override the standard permission test for Item entities as we need to apply a special check for owned items
     * OwnedItems have permission that the player has for the parent Actor.
     * @return	Whether or not the user has the permission for this item
     */
    hasPerm(...args: any[]): boolean;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /**
     * A convenience constructor method to create an Item instance which is owned by an Actor
     */
    static createOwned<TI extends typeof Item>(
        this: TI,
        itemData: Partial<InstanceType<TI>['data']>,
        actor: Actor,
    ): Promise<InstanceType<TI>>;
}
