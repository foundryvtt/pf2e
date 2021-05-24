declare interface ItemData extends BaseEntityData {
    type: string;
    data: {};
    effects: foundry.abstract.EmbeddedCollection<ActiveEffect>;
    folder?: string | null;
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

declare class Item extends Entity {
    /** The item's collection of ActiveEffects */
    effects: this['data']['effects'];

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
    get actor(): this['parent'];

    /**
     * A convenience reference to the image path (data.img) used to represent this Item
     */
    get img(): ImagePath;

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
    testUserPermission(user: User, permission: DocumentPermission | UserAction, options?: { exact?: boolean }): boolean;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /**
     * A convenience constructor method to create an Item instance which is owned by an Actor
     */
    static createOwned<I extends Item>(
        this: new (data: I['data'], options?: EntityConstructorOptions) => I,
        itemData: I['data'],
        actor: Actor,
    ): Owned<I>;

    /**
     * Provide a Dialog form to create a new Entity of this type.
     * Choose a name and a type from a select menu of types.
     * @param data    Initial data with which to populate the creation form
     * @param options Initial positioning and sizing options for the dialog form
     * @return A Promise which resolves to the created Entity
     */
    static createDialog(data?: { folder?: string }, options?: FormApplicationOptions): Promise<Item>;
}

declare interface Item extends Entity {
    readonly data: ItemData;
    readonly parent: Actor | null;

    getEmbeddedDocument(
        collection: 'ActiveEffect',
        id: string,
        { strict }?: { strict?: boolean },
    ): ActiveEffect | undefined;

    getFlag(scope: string, key: string): any;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
}

declare namespace Item {
    function create<I extends Item>(
        this: new (...args: any[]) => I,
        data: PreCreate<I['data']>,
        options?: EntityCreateOptions,
    ): Promise<I | undefined>;
    function create<I extends Item>(
        this: new (...args: any[]) => I,
        data: PreCreate<I['data']>[],
        options?: EntityCreateOptions,
    ): Promise<I[]>;
    function create<I extends Item>(
        this: new (...args: any[]) => I,
        data: PreCreate<I['data']>[] | PreCreate<I['data']>,
        options?: EntityCreateOptions,
    ): Promise<I[] | I | undefined>;
}
