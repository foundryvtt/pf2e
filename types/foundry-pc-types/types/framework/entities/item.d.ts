/**
 * The Collection of Item entities
 * The items collection is accessible within the game as game.items
 */

declare class Items<ItemType extends Item> extends EntityCollection<ItemType> {
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
    static registerSheet<I extends Item>(
        scope: string,
        sheetClass: new (item: I, options?: FormApplicationOptions) => I['sheet'],
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

declare interface ItemData extends BaseEntityData {
    type: string;
    data: {};
    effects: ActiveEffectData[];
    sort: number;
}

type ItemUpdateData = EntityUpdateData<ItemData>;

declare interface ItemClassConfig<I extends Item> extends EntityClassConfig<I> {
    collection: Items<I>;
    embeddedEntities: {
        ActiveEffect: 'effects';
    };
}

declare interface ItemConstructorOptions<A extends Actor> extends EntityConstructorOptions {
    actor?: A;
}

declare type ItemCreateData<I extends Item> = DeepPartial<I['data']>;

type _Actor = Actor<Item<_Actor>>;
declare class Item<ActorType extends Actor = _Actor> extends Entity {
    /** The item's collection of ActiveEffects */
    effects: Collection<ActiveEffect>;

    /** @override */
    static get config(): ItemClassConfig<Item>;

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
     * @return  Whether or not the user has the permission for this item
     */
    hasPerm(...args: any[]): boolean;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /**
     * A convenience constructor method to create an Item instance which is owned by an Actor
     */
    static createOwned<A extends Actor, I extends Item<A>>(
        this: new (data: I['data'], options?: ItemConstructorOptions<A>) => I,
        itemData: ItemCreateData<I>,
        actor: A,
    ): Promise<I>;

    // Signature overload
    getEmbeddedEntity(collection: 'ActiveEffect', id: string, { strict }?: { strict?: boolean }): ActiveEffect['data'];
    getEmbeddedEntity(collection: string, id: string, { strict }?: { strict?: boolean }): never;
}

declare interface Item<ActorType extends Actor = _Actor> extends Entity {
    data: ItemData;
    _data: ItemData;
}
