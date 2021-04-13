declare interface ActorData<D extends ItemData = ItemData> extends BaseEntityData {
    type: string;
    img: string;
    data: {};
    token: TokenData;
    items: D[];
    effects: ActiveEffectData[];
    folder?: string | null;
    sort: number;
}

declare interface ActorClassConfig<A extends Actor> extends EntityClassConfig<A> {
    collection: Actors<A>;
    embeddedEntities: {
        ActiveEffect: 'effects';
        OwnedItem: 'items';
    };
}

/**
 * The Collection of Actor entities.
 *
 * @see {@link Actor} The Actor entity.
 * @see {@link ActorDirectory} All Actors which exist in the world are rendered within the ActorDirectory sidebar tab.
 *
 * @example <caption>Retrieve an existing Actor by its id</caption>
 * let actor = game.actors.get(actorId);
 */
declare class Actors<ActorType extends Actor> extends EntityCollection<ActorType> {
    /**
     * A mapping of synthetic Token Actors which are currently active within the viewed Scene.
     * Each Actor is referenced by the Token.id.
     */
    tokens: { [tokenID: string]: ActorType };

    /** @override */
    get entity(): 'Actor';

    /* -------------------------------------------- */
    /*  Sheet Registration Methods                  */
    /* -------------------------------------------- */

    /**
     * Register an Actor sheet class as a candidate which can be used to display Actors of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    static registerSheet<A extends Actor>(
        scope: string,
        sheetClass: new (actor: A, options?: FormApplicationOptions) => A['sheet'],
        options?: RegisterSheetOptions,
    ): void;

    /**
     * Unregister an Actor sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     */
    static unregisterSheet<TS extends typeof ActorSheet>(scope: string, sheetClass: TS): void;

    /**
     * Return an Array of currently registered sheet classes for this Entity type
     */
    static get registeredSheets(): typeof ActorSheet[];
}

type Owned<I extends Item> = I & {
    actor: NonNullable<I['actor']>;
};

/**
 * The Actor Entity which represents the protagonists, characters, enemies, and more that inhabit and take actions
 * within the World.
 *
 * @see {@link Actors} Each Actor belongs to the Actors collection.
 * @see {@link ActorSheet} Each Actor is edited using the ActorSheet application or a subclass thereof.
 * @see {@link ActorDirectory} All Actors which exist in the world are rendered within the ActorDirectory sidebar tab.
 *
 *
 * @example <caption>Create a new Actor</caption>
 * let actor = await Actor.create({
 *   name: "New Test Actor",
 *   type: "character",
 *   img: "artwork/character-profile.jpg",
 *   folder: folder.data._id,
 *   sort: 12000,
 *   data: {},
 *   token: {},
 *   items: [],
 *   flags: {}
 * });
 *
 * @example <caption>Retrieve an existing Actor</caption>
 * let actor = game.actors.get(actorId);
 */
declare class Actor<ItemType extends Item = Item, EffectType extends ActiveEffect = _ActiveEffect> extends Entity {
    /**
     * A reference to a placed Token which creates a synthetic Actor
     */
    token: Token<this> | null;

    /**
     * Construct the Array of Item instances for the Actor
     */
    items: Collection<Owned<ItemType>>;

    /**
     * A set that tracks which keys in the data model were modified by active effects
     */
    overrides: Record<string, any>;

    /** The actor's collection of ActiveEffects */
    effects: Collection<EffectType>;

    /**
     * Cache an Array of allowed Token images if using a wildcard path
     */
    protected _tokenImages: string[] | null;

    /** @override */
    static get config(): ActorClassConfig<Actor>;

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /** @override */
    prepareData(): void;

    /**
     * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
     */
    prepareBaseData(): void;

    /** @override */
    prepareEmbeddedEntities(): void;

    /**
     * Prepare a Collection of OwnedItem instances which belong to this Actor.
     * @param items The raw array of item objects
     * @return The prepared owned items collection
     */
    protected _prepareOwnedItems(items: this['data']['items']): Collection<Owned<ItemType>>;

    /**
     * Prepare a Collection of ActiveEffect instances which belong to this Actor.
     * @param effects The raw array of active effect objects
     * @return The prepared active effects collection
     */
    protected _prepareActiveEffects(effects: EffectType['data'][]): Collection<EffectType>;

    /**
     * Apply any transformations to the Actor data which are caused by ActiveEffects.
     */
    applyActiveEffects(): void;

    /**
     * Apply final transformations to the Actor data after all effects have been applied
     */
    prepareDerivedData(): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A convenient reference to the file path of the Actor's profile image
     */
    get img(): string;

    /**
     * A boolean flag for whether this Actor is a player-owned character.
     * True if any User who is not a GM has ownership rights over the Actor entity.
     */
    get hasPlayerOwner(): boolean;

    /**
     * Test whether an Actor entity is a synthetic representation of a Token (if true) or a full Entity (if false)
     */
    get isToken(): boolean;

    /**
     * Create a synthetic Actor using a provided Token instance
     * If the Token data is linked, return the true Actor entity
     * If the Token data is not linked, create a synthetic Actor using the Token's actorData override
     * @param token
     */
    static fromToken<A extends Actor>(
        this: new (data: A['data'], options?: EntityConstructorOptions) => A,
        token: Token<A>,
    ): A | null;

    /**
     * Create a synthetic Token Actor instance which is used in place of an actual Actor.
     * Cache the result in Actors.tokens.
     * @param baseActor
     * @param token
     */
    static createTokenActor<A extends Actor>(
        this: new (data: A['data'], options?: EntityConstructorOptions) => A,
        baseActor: A,
        token: Token<A>,
    ): A;

    /** @override */
    updateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData>;
    updateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[]>;
    updateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ItemType['data']>;
    updateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ItemType['data'] | ItemType['data'][]>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof Actor['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ItemType['data']>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof Actor['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemType['data'] | ItemType['data'][]>;

    /**
     * Retrieve an Array of active tokens which represent this Actor in the current canvas Scene.
     * If the canvas is not currently active, or there are no linked actors, the returned Array will be empty.
     *
     * @param linked    Only return tokens which are linked to the Actor. Default (false) is to return all
     *                  tokens even those which are not linked.
     *
     * @return          An array of tokens in the current Scene which reference this Actor.
     */
    getActiveTokens(linked?: boolean): Token<this>[];

    /**
     * Get an Array of Token images which could represent this Actor
     */
    getTokenImages(): Promise<any>;

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     * @param attribute The attribute path
     * @param value     The target attribute value
     * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
     */
    modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean): Promise<this>;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers
    /* -------------------------------------------- */

    /** @override */
    protected _onUpdate(data: object, options: object, userId: string, context: object): void;

    /* -------------------------------------------- */
    /* Owned Item Management
    /* -------------------------------------------- */

    /**
     * Import a new owned Item from a compendium collection
     * The imported Item is then added to the Actor as an owned item.
     *
     * @param collection    The name of the pack from which to import
     * @param entryId       The ID of the compendium entry to import
     */
    importItemFromCollection(collection: string, entryId: string): ItemType;

    /**
     * Get an owned item by it's ID, initialized as an Item entity class
     * @param itemId The ID of the owned item
     * @return       An Item class instance for that owned item or null if the itemId does not exist
     */
    getOwnedItem(itemId: string): Owned<ItemType> | null;

    // Signature overload
    getEmbeddedEntity(collection: 'OwnedItem', id: string, { strict }?: { strict?: boolean }): ItemType['data'];
    getEmbeddedEntity(collection: 'ActiveEffect', id: string, { strict }?: { strict?: boolean }): EffectType['data'];
    getEmbeddedEntity(collection: string, id: string, { strict }?: { strict?: boolean }): never;

    /**
     * Create a new item owned by this Actor.
     * @param itemData              Data for the newly owned item
     * @param options               Item creation options
     * @param options.renderSheet   Render the Item sheet for the newly created item data
     * @return                      A Promise containing the data of the newly created owned Item instance
     */
    createOwnedItem<D extends ItemType['data']>(
        itemData: DeepPartial<D>,
        options?: EntityCreateOptions,
    ): Promise<D | null>;
    createOwnedItem<D extends ItemType['data']>(
        itemData: DeepPartial<D>[],
        options?: EntityCreateOptions,
    ): Promise<D | null | (D | null)[]>;
    createOwnedItem<D extends ItemType['data']>(
        itemData: DeepPartial<D> | DeepPartial<D>[],
        options?: EntityCreateOptions,
    ): Promise<D | null | (D | null)[]>;

    /**
     * Update an owned item using provided new data
     * @param itemData  Data for the item to update
     * @param options   Item update options
     * @return          A Promise resolving to the updated Item object
     */
    updateOwnedItem(
        itemData: EntityUpdateData<ItemType['data']>,
        options?: EntityUpdateOptions,
    ): Promise<ItemType['data']>;

    /**
     * Delete an owned item by its id. This redirects its arguments to the deleteEmbeddedEntity method.
     * @param itemId    The ID of the item to delete
     * @param options   Item deletion options
     * @return          A Promise resolving to the deleted Owned Item data
     */
    deleteOwnedItem(itemId: string[], options?: object): Promise<ItemType[] | ItemType>;
    deleteOwnedItem(itemId: string, options?: object): Promise<ItemType>;

    /** @override */
    protected _onCreateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        child: ActiveEffectData,
        options: EntityCreateOptions,
        userId: string,
    ): void;
    protected _onCreateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        child: ItemType['data'],
        options: EntityCreateOptions,
        userId: string,
    ): void;
    protected _onCreateEmbeddedEntity(
        embeddedName: 'ActiveEffect' | 'OwnedItem',
        child: ActiveEffectData | ItemType['data'],
        options: EntityCreateOptions,
        userId: string,
    ): void;

    /** @override */
    protected _onDeleteEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        child: ActiveEffectData,
        options: EntityDeleteOptions,
        userId: string,
    ): void;
    protected _onDeleteEmbeddedEntity(
        embeddedName: 'OwnedItem',
        child: ItemType['data'],
        options: EntityDeleteOptions,
        userId: string,
    ): void;
    protected _onDeleteEmbeddedEntity(
        embeddedName: 'ActiveEffect' | 'OwnedItem',
        child: ActiveEffectData | ItemType['data'],
        options: EntityDeleteOptions,
        userId: string,
    ): void;

    /** @override */
    deleteEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        dataId: string,
        options?: EntityDeleteOptions,
    ): Promise<ActiveEffectData>;
    deleteEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        dataId: string | string[],
        options?: EntityDeleteOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[]>;
    deleteEmbeddedEntity(
        embeddedName: 'OwnedItem',
        dataId: string,
        options?: EntityDeleteOptions,
    ): Promise<ItemType['data']>;
    deleteEmbeddedEntity(
        embeddedName: 'OwnedItem',
        dataId: string | string[],
        options?: EntityDeleteOptions,
    ): Promise<ItemType['data'] | ItemType['data'][]>;
    deleteEmbeddedEntity(
        embeddedName: 'ActiveEffect' | 'OwnedItem',
        dataId: string | string[],
        options?: EntityDeleteOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemType['data'] | ItemType['data'][]>;
}

declare interface Actor<ItemType extends Item = Item, EffectType extends ActiveEffect = ActiveEffect> {
    data: ActorData<ItemType['data']>;
    _data: ActorData<ItemType['data']>;

    readonly sheet: ActorSheet<this, ItemType['data']>;

    getFlag(scope: string, key: string): any;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
}

declare type PreCreate<D extends ActorData | ItemData> = Omit<Partial<D>, 'type'> & { type: D['type'] };

declare namespace Actor {
    function create<A extends Actor>(
        this: new (data: A['data'], options?: EntityConstructorOptions) => A,
        data: PreCreate<A['data']>,
        options?: EntityCreateOptions,
    ): Promise<A>;
    function create<A extends Actor>(
        this: new (data: A['data'], options?: EntityConstructorOptions) => A,
        data: PreCreate<A['data']> | PreCreate<A['data']>[],
        options?: EntityCreateOptions,
    ): Promise<A[] | A>;
}
