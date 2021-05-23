declare interface ActorData<TItem extends Item = Item, TActiveEffect extends ActiveEffect = ActiveEffect>
    extends BaseEntityData {
    type: string;
    img: ImagePath;
    data: {};
    token: TokenData;
    items: Collection<Owned<TItem>>;
    effects: foundry.abstract.EmbeddedCollection<TActiveEffect>;
    folder?: string | null;
    sort: number;
}

declare interface ActorClassConfig<A extends Actor> extends EntityClassConfig<A> {
    collection: Actors<A>;
    embeddedDocuments: {
        ActiveEffect: 'effects';
        Item: 'items';
    };
}

declare interface ActorConstructorOptions<T extends Token> extends EntityConstructorOptions {
    token?: T;
}

type Owned<I extends Item> = I & {
    parent: NonNullable<I['parent']>;
};

/** A structural subset of an ActiveEffect instance */
interface TemporaryEffect {
    isTemporary: boolean;
    data: {
        disabled: boolean;
        icon: string;
        tint: string;
    };

    getFlag(scope: 'core', key: 'overlay'): string | undefined;
    getFlag(scope: 'core', key: 'statusId'): string | undefined;
    getFlag(scope: string, key: string): unknown;
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
declare class Actor extends Entity {
    /**
     * A reference to a placed Token which creates a synthetic Actor
     */
    token: Token<this> | null;

    /**
     * Construct the Array of Item instances for the Actor
     */
    readonly items: Collection<Item>;

    options: ActorConstructorOptions<Token>;

    /**
     * A set that tracks which keys in the data model were modified by active effects
     */
    overrides: Record<string, any>;

    /** The actor's collection of ActiveEffects */
    readonly effects: foundry.abstract.EmbeddedCollection<ActiveEffect>;

    /**
     * Cache an Array of allowed Token images if using a wildcard path
     */
    protected _tokenImages: string[] | null;

    get temporaryEffects(): TemporaryEffect[];

    /** A convenience reference to the type (data.type) of this Actor */
    get type(): string;

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
    get img(): ImagePath;

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
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData[],
        options?: DocumentModificationContext,
    ): Promise<ActiveEffect[]>;
    updateEmbeddedDocuments(
        embeddedName: 'Item',
        updateData: EmbeddedDocumentUpdateData[],
        options?: DocumentModificationContext,
    ): Promise<Item[]>;
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        updateData: EmbeddedEntityUpdateData[],
        options?: DocumentModificationContext,
    ): Promise<ActiveEffect[] | Item[]>;

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
    protected _onUpdate<A extends Actor>(
        changed: DeepPartial<A['data']>,
        options: EntityUpdateOptions,
        userId: string,
    ): void;

    /* -------------------------------------------- */
    /* Owned Item Management
    /* -------------------------------------------- */

    /** @override */
    protected _onCreateEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        documents: ActiveEffect[],
        result: foundry.data.ActiveEffectSource[],
        options: DocumentModificationContext,
        userId: string,
    ): void;
    protected _onCreateEmbeddedDocuments(
        embeddedName: 'Item',
        documents: Item[],
        result: ItemData[],
        options: DocumentModificationContext,
        userId: string,
    ): void;
    protected _onCreateEmbeddedDocuments(
        embeddedName: 'Item',
        documents: ActiveEffect[] | Item[],
        result: foundry.data.ActiveEffectSource[] | ItemData[],
        options: DocumentModificationContext,
        userId: string,
    ): void;

    /** @override */
    protected _onDeleteEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        documents: ActiveEffect[],
        result: string[],
        options: DocumentModificationContext,
        userId: string,
    ): void;
    protected _onDeleteEmbeddedDocuments(
        embeddedName: 'Item',
        documents: Item[],
        result: string[],
        options: DocumentModificationContext,
        userId: string,
    ): void;
    protected _onDeleteEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        documents: ActiveEffect[] | Item[],
        result: string[],
        options: DocumentModificationContext,
        userId: string,
    ): void;

    /** @override */
    protected _onUpdateEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        documents: ActiveEffect[] | Item[],
        result: EmbeddedEntityUpdateData[],
        options: DocumentModificationContext,
        userId: string,
    ): void;

    /** @override */
    deleteEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        dataId: string[],
        options?: EntityDeleteOptions,
    ): Promise<ActiveEffect[]>;
    deleteEmbeddedDocuments(embeddedName: 'Item', dataId: string[], options?: EntityDeleteOptions): Promise<Item[]>;
    deleteEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        dataId: string | string[],
        options?: EntityDeleteOptions,
    ): Promise<ActiveEffect[] | Item[]>;

    migrateSystemData({
        insertKeys,
        insertValues,
        enforceTypes,
    }?: {
        insertKeys?: boolean;
        insertValues?: boolean;
        enforceTypes?: boolean;
    }): this['data']['data'];
}

declare interface Actor {
    data: ActorData;

    readonly sheet: ActorSheet<Actor, Item>;

    getEmbeddedDocument(collection: 'Item', id: string, { strict }?: { strict?: boolean }): Item | undefined;
    getEmbeddedDocument(
        collection: 'ActiveEffect',
        id: string,
        { strict }?: { strict?: boolean },
    ): ActiveEffect | undefined;

    createEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        data: DeepPartial<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext,
    ): Promise<ActiveEffect[]>;
    createEmbeddedDocuments(
        embeddedName: 'Item',
        data: DeepPartial<ItemData>[],
        context?: DocumentModificationContext,
    ): Promise<Item[]>;
    createEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        data: DeepPartial<foundry.data.ActiveEffectSource>[] | DeepPartial<ItemData>[],
        context?: DocumentModificationContext,
    ): Promise<ActiveEffect[] | Item[]>;

    getFlag(scope: string, key: string): any;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
}

declare type PreCreate<D extends ActorData | ItemData> = Omit<Partial<D>, 'type'> & { type: D['type'] };

declare namespace Actor {
    function create<A extends Actor>(
        this: new (...args: any[]) => A,
        data: PreCreate<A['data']>,
        options?: EntityCreateOptions,
    ): Promise<A | undefined>;
    function create<A extends Actor>(
        this: new (...args: any[]) => A,
        data: PreCreate<A['data']>[],
        options?: EntityCreateOptions,
    ): Promise<A[]>;
    function create<A extends Actor>(
        this: new (...args: any[]) => A,
        data: PreCreate<A['data']>[] | PreCreate<A['data']>,
        options?: EntityCreateOptions,
    ): Promise<A[] | A | undefined>;
}
