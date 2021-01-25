declare interface ActorData extends BaseEntityData {
    type: string;
    img: string;
    token: TokenData;
    items: BaseItemData[];
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
declare class Actors<ActorType extends Actor = Actor> extends Collection<ActorType> {
    entities: ActorType[];

    /**
     * A mapping of synthetic Token Actors which are currently active within the viewed Scene.
     * Each Actor is referenced by the Token.id.
     */
    tokens: { [tokenID: string]: ActorType };

    /** @override */
    get object(): ActorType;

    values(): IterableIterator<ActorType>;

    /* -------------------------------------------- */
    /*  Sheet Registration Methods                  */
    /* -------------------------------------------- */

    /**
     * Register an Actor sheet class as a candidate which can be used to display Actors of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    static registerSheet(...args: any): void;

    /**
     * Unregister an Actor sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     */
    static unregisterSheet(...args: any): void;

    /**
     * Return an Array of currently registered sheet classes for this Entity type
     */
    static get registeredSheets(): any[];
}

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
declare class Actor<ItemType extends Item = Item> extends Entity {
    data: ActorData;

    /**
     * A reference to a placed Token which creates a synthetic Actor
     */
    token: Token<this> | null;

    /**
     * Construct the Array of Item instances for the Actor
     */
    items: Collection<ItemType>;

    /**
     * Cache an Array of allowed Token images if using a wildcard path
     */
    protected _tokenImages: any[];

    /** @override */
    static get config(): {
        baseEntity: Actor;
        collection: Actors;
        embeddedEntities: { OwnedItem: string };
    };

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /** @override */
    prepareData(): void;

    /** @override */
    prepareEmbeddedEntities(): void;

    /**
     * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
     */
    prepareBaseData(): void;

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
    static fromToken<TA extends typeof Actor>(this: TA, token: Token<InstanceType<TA>>): InstanceType<TA>;

    /**
     * Create a synthetic Token Actor instance which is used in place of an actual Actor.
     * Cache the result in Actors.tokens.
     * @param baseActor
     * @param token
     */
    static createTokenActor<TA extends typeof Actor>(
        this: TA,
        baseActor: InstanceType<TA>,
        token: Token<InstanceType<TA>>,
    ): InstanceType<TA>;

    /** @override */
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<this['data']>;
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<this['data'] | this['data'][]>;
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData | EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<this['data'] | this['data'][]>;

    /**
     * Retrieve an Array of active tokens which represent this Actor in the current canvas Scene.
     * If the canvas is not currently active, or there are no linked actors, the returned Array will be empty.
     *
     * @param linked	Only return tokens which are linked to the Actor. Default (false) is to return all
     *					tokens even those which are not linked.
     *
     * @return			An array of tokens in the current Scene which reference this Actor.
     */
    getActiveTokens(linked?: boolean): Token<this>[];

    /**
     * Get an Array of Token images which could represent this Actor
     */
    getTokenImages(): Promise<any>;

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     * @param attribute	The attribute path
     * @param value		The target attribute value
     * @param isDelta	Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar		Whether the new value is part of an attribute bar, or just a direct value
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
     * @param collection	The name of the pack from which to import
     * @param entryId		The ID of the compendium entry to import
     */
    importItemFromCollection(collection: string, entryId: string): ItemType;

    /**
     * Get an owned item by it's ID, initialized as an Item entity class
     * @param itemId	The ID of the owned item
     * @return			An Item class instance for that owned item or null if the itemId does not exist
     */
    getOwnedItem(itemId: string): ItemType | null;

    /**
     * Create a new item owned by this Actor.
     * @param itemData				Data for the newly owned item
     * @param options				Item creation options
     * @param options.renderSheet	Render the Item sheet for the newly created item data
     * @return						A Promise containing the data of the newly created owned Item instance
     */
    createOwnedItem<I extends ItemType['data']>(itemData: Partial<I>[] | I[], options?: object): Promise<I | I[]>;
    createOwnedItem<I extends ItemType['data']>(itemData: Partial<I> | I, options?: object): Promise<I>;

    /**
     * Update an owned item using provided new data
     * @param itemData	Data for the item to update
     * @param options	Item update options
     * @return			A Promise resolving to the updated Item object
     */
    updateOwnedItem(itemData: object, options?: object): Promise<ItemType>;

    /**
     * Delete an owned item by its id. This redirects its arguments to the deleteEmbeddedEntity method.
     * @param itemId	The ID of the item to delete
     * @param options	Item deletion options
     * @return			A Promise resolving to the deleted Owned Item data
     */
    deleteOwnedItem(itemId: string[], options?: object): Promise<ItemType[] | ItemType>;
    deleteOwnedItem(itemId: string, options?: object): Promise<ItemType>;
}
