declare function fromUuid(uuid: string): Promise<Entity | null>;

declare interface EntityDescriptionData {
    [key: string]: any;
}

declare interface BaseEntityData {
    _id: string;
    name: string;
    type?: number | string;
    data: EntityDescriptionData;
    flags: any;
    folder: string | null;
    permission: any;
    img: string;
}

declare interface EntityCreateOptions {
    temporary?: boolean;
    renderSheet?: boolean;
    noHook?: boolean;
    [key: string]: unknown;
}

declare interface EntityConstructorOptions {
    [key: string]: unknown;
}

declare type EntityUpdateData = BaseEntityData | { _id: string; [key: string]: unknown };

declare interface EntityUpdateOptions {
    diff?: boolean;
    noHook?: boolean;
    [key: string]: unknown;
}

declare interface EntityDeleteOptions {
    noHook?: boolean;
    [key: string]: unknown;
}

/**
 * An abstract class pattern for all primary data entities within the Foundry VTT Framework
 * An entity represents a primary data concept, for example: Actor, Item, Scene, or ChatMessage.
 * Employing this abstraction layer ensures similar behavior and workflow for all entity types.
 *
 * Documentation for this class is provided for reference, but developers should not extend this class directly,
 * instead work with or extend the Entity implementations that are referenced in this section of the API documentation.
 *
 * Entities are instantiated by providing their base data, and an optional Array of Application instances which should
 * be automatically refreshed when the Entity experiences an update.
 *
 * @param data		The data Object with which to create the Entity
 * @param options	Additional options which modify the created Entity behavior
 *
 * @example
 * let actorData = {name: "John Doe", type: "character", img: "icons/mystery-man.png"};
 * let actor = new Actor(actorData);
 */
declare class Entity {
    /** The Entity references the raw source data for the object provided through game.data */
    data: BaseEntityData;
    _data: this['data'];

    /**
     * The original source data for the Entity provided upon initialization.
     * This reflects the database state of the Entity before any transformations are applied.
     */

    /** Additional options which were used to configure the Entity */
    options: EntityConstructorOptions;

    /**
     * A collection of Application instances which should be re-rendered whenever this Entity experiences an update to
     * its data. The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Entity#render}.
     */
    apps: Application;

    /**
     * The Entity may optionally belong to a parent Compendium pack. If so this attribute will contain a reference
     * to that Compendium object. Otherwise null.
     */
    compendium: Compendium;

    constructor(data: BaseEntityData, options?: any);

    /**
     * Configure the attributes of this Entity class
     * @property baseEntity       The parent class which directly inherits from the Entity interface.
     * @property collection   The Collection instance to which Entities of this type belong.
     * @property embeddedEntities  The names of any Embedded Entities within the Entity data structure.
     */
    static get config(): {
        baseEntity: Entity;
        collection: Collection<Entity>;
        embeddedEntities: any;
    };

    /**
     * A Universally Unique Identifier (uuid) for this Entity instance
     */
    get uuid(): string;

    /**
     * Initialize data structure for the Entity.
     * First initialize any Embedded Entities and prepare their data.
     * Next prepare data for the Entity itself, which may depend on Embedded Entities.
     */
    initialize(): void;

    /**
     * Prepare data for the Entity whenever the instance is first created or later updated.
     * This method can be used to derive any internal attributes which are computed in a formulaic manner.
     * For example, in a d20 system - computing an ability modifier based on the value of that ability score.
     */
    prepareData(): BaseEntityData | void;

    /**
     * Prepare Embedded Entities which exist within this parent Entity.
     * For example, in the case of an Actor, this method is responsible for preparing the Owned Items the Actor contains.
     */
    prepareEmbeddedEntities(): void;

    /**
     * Prepare data for a single Embedded Entity which exists within the parent Entity.
     * @param embeddedName	The name of the Embedded Entity type
     * @param data			The data used to initialize it
     * @returns				The Embedded Entity object
     */
    private _constructEmbeddedEntity(embeddedName: string, data: object): void;

    /**
     * Obtain a reference to the Array of source data within the data object for a certain Embedded Entity name
     * @param embeddedName	The name of the Embedded Entity type
     * @return				The Array of source data where Embedded Entities of this type are stored
     */
    getEmbeddedCollection(embeddedName: string): Array<any>;

    /* -------------------------------------------- */
    /*  Properties
	/* -------------------------------------------- */

    /**
     * Return a reference to the Collection instance which stores Entity instances of this type. This property is
     * available as both a static and instance method and should be overridden by subclass Entity implementations.
     */
    static get collection(): Collection<Entity>;

    /** @alias Entity.collection */
    get collection(): Collection<Entity>;

    /**
     * The class name of the base Entity type, for example "Actor". This is useful in cases where there is an inheritance
     * chain. Many places throughout the framework rely upon the canonical entity name which may not always be equal
     * to the class name. This property is available as both a static and instance method.
     *
     * @example
     * class Actor2ndGen extends Actor {...}
     * Actor2ndGen.entity // "Actor"
     */
    static get entity(): string;

    /** @alias Entity.entity */
    get entity(): Entity;

    /**
     * A convenience accessor for the _id attribute of the Entity data object
     */
    get id(): string;

    /** @alias Entity.id */
    get _id(): string;

    /**
     * A convenience accessor for the name attribute of the Entity data object
     */
    get name(): string;

    /**
     * A property which gets or creates a singleton instance of the sheet class used to render and edit data for this
     * particular entity type.
     *
     * @example <caption>A subclass of the Actor entity</caption>
     * let actor = game.entities.actors[0];
     * actor.sheet; // ActorSheet
     */
    get sheet(): BaseEntitySheet<Entity>;

    /**
     * Obtain a reference to the BaseEntitySheet implementation which should be used to render the Entity instance
     * configuration sheet.
     */
    protected get _sheetClass(): any;

    /**
     * Return a reference to the Folder which this Entity belongs to, if any.
     *
     * @example <caption>Entities may belong to Folders</caption>
     * let folder = game.folders.entities[0];
     * let actor = await Actor.create({name: "New Actor", folder: folder.id});
     * console.log(actor.data.folder); // folder.id;
     * console.log(actor.folder); // folder;
     */
    get folder(): Folder | null;

    /**
     * Return an array of User entities who have a certain permission level or greater to the Entity.
     * @param permission  The permission level or level name to test
     * @param exact       Tests for an exact permission level match, by default this method tests for
     *                                      an equal or greater permission level
     * @returns  An array of User entities who match the permission level
     */
    getUsers(permission: string, exact?: boolean): User[];

    /**
     * Return the permission level that the current game User has over this Entity.
     * See the CONST.ENTITY_PERMISSIONS object for an enumeration of these levels.
     *
     * @example
     * game.user.id; // "dkasjkkj23kjf"
     * entity.data.permission; // {default: 1, "dkasjkkj23kjf": 2};
     * entity.permission; // 2
     */
    get permission(): number;

    /**
     * A boolean indicator for whether or not the current game User has ownership rights for this Entity
     * This property has a setter which allows for ownership rights to be overridden specifically on a per-instance basis
     */
    set owner(isOwner: boolean);

    get owner(): boolean;

    /**
     * A boolean indicator for whether or not the current game User has at least limited visibility for this Entity.
     */
    get visible(): boolean;

    /**
     * A boolean indicator for whether the current game user has ONLY limited visibility for this Entity.
     * Note that a GM user's perspective of an Entity is never limited.
     */
    get limited(): boolean;

    /* -------------------------------------------- */
    /* Methods
	/* -------------------------------------------- */

    /**
     * Render all of the Application instances which are connected to this Entity by calling their respective
     * {@link Application#render} methods.
     * @param {...*} args      Variable arguments which are forwarded to each Application's render call
     */
    render(...args: any): void;

    /**
     * Test whether a provided User a specific permission level (or greater) over the Entity instance
     * @param user			The user to test for permission
     * @param permission	The permission level or level name to test
     * @param exact			Tests for an exact permission level match, by default this method tests for
     *						an equal or greater permission level.
     * @return				Whether or not the user has the permission for this Entity.
     *
     * @example <caption>Test whether a specific user has a certain permission</caption>
     * // These two are equivalent
     * entity.hasPerm(game.user, "OWNER");
     * entity.owner;
     * // These two are also equivalent
     * entity.hasPerm(game.user, "LIMITED", true);
     * entity.limited;
     */
    hasPerm(user: User, permission: string | number, exact?: boolean): boolean;

    /* -------------------------------------------- */
    /*  Entity Management Methods                   */
    /* -------------------------------------------- */

    /**
     * Create one or multiple new entities using provided input data.
     * Data may be provided as a single object to create one Entity, or as an Array of Objects.
     * Entities may be temporary (unsaved to the database) by passing the temporary option as true.
     * @static
     *
     * @param data                        A Data object or array of Data
     * @param options                         Additional options which customize the creation workflow
     * @param [options.temporary]         Create a temporary entity which is not saved to the world database. Default is false.
     * @param [options.renderSheet]     Display the sheet for the created entity once it is created. Default is false.
     * @param [options.noHook]                Block the dispatch of preCreate hooks for this operation.
     *
     * @return  The created Entity or array of Entities
     *
     * @example
     * const data = {name: "New Entity", type: "character", img: "path/to/profile.jpg"};
     * const created = await Entity.create(data); // Returns one Entity, saved to the database
     * const temp = await Entity.create(data, {temporary: true}); // Not saved to the database
     *
     * @example
     * const data = [{name: "Tim", type: "npc"], [{name: "Tom", type: "npc"}];
     * const created = await Entity.create(data); // Returns an Array of Entities, saved to the database
     * const created = await Entity.create(data, {temporary: true}); // Not saved to the database
     */
    static create<E extends Entity>(
        this: new (data: E['data'], options?: EntityConstructorOptions) => E,
        data: Partial<E['data']> | E['data'],
        options?: EntityCreateOptions,
    ): Promise<E>;
    static create<E extends Entity>(
        this: new (data: E['data'], options?: EntityConstructorOptions) => E,
        data: Partial<E['data']>[] | E['data'][],
        options?: EntityCreateOptions,
    ): Promise<E[] | E>;

    /**
     * Update one or multiple existing entities using provided input data.
     * Data may be provided as a single object to update one Entity, or as an Array of Objects.
     * @static
     *
     * @param data              A Data object or array of Data. Each element must contain the _id of an existing Entity.
     * @param options           Additional options which customize the update workflow
     * @param [options.diff]    Difference the provided data against the current to eliminate unnecessary changes.
     * @param [options.noHook]  Block the dispatch of preUpdate hooks for this operation.
     *
     * @return  The updated Entity or array of Entities
     *
     * @example
     * const data = {_id: "12ekjf43kj2312ds", name: "New Name"}};
     * const updated = await Entity.update(data); // Updated entity saved to the database
     *
     * @example
     * const data = [{_id: "12ekjf43kj2312ds", name: "New Name 1"}, {_id: "kj549dk48k34jk34", name: "New Name 2"}]};
     * const updated = await Entity.update(data); // Returns an Array of Entities, updated in the database
     */
    update(data: object, options?: EntityUpdateOptions): Promise<this>;

    /**
     * Delete the current Entity.
     * @see {Entity.delete}

     * @param  options  Options which customize the deletion workflow
     * @return  The deleted Entity
     */
    delete(options?: EntityDeleteOptions): Promise<this>;

    /**
     * Entity-specific actions that should occur when the Entity is first created
     */
    protected _onCreate(data: object, options: object, userId: string, context: object): void;

    /**
     * Entity-specific actions that should occur when the Entity is updated
     */
    protected _onUpdate(data: object, options: object, userId: string, context: object): void;

    /**
     * Entity-specific actions that should occur when the Entity is deleted
     */
    protected _onDelete(id: string, options: object, userId: string, context: any): void;

    /* -------------------------------------------- */
    /*  Embedded Entity Management                  */
    /* -------------------------------------------- */

    /**
     * Get an Embedded Entity by it's ID from a named collection in the parent
     * @param collection	The named collection of embedded entities
     * @param id			The numeric ID of the child to retrieve
     * @return				Retrieved data for the requested child, or null
     */
    getEmbeddedEntity(collection: string, id: number, { strict }: { strict?: boolean }): any;

    /**
     * Create one or multiple EmbeddedEntities within this parent Entity.
     * Data may be provided as a single Object to create one EmbeddedEntity or as an Array of Objects to create many.
     * Entities may be temporary (unsaved to the database) by passing the temporary option as true.
     *
     * @param embeddedName           The name of the Embedded Entity class to create
     * @param data                   A Data object or an Array of Data objects to create
     * @param options                Additional creation options which modify the request
     * @param [options.temporary]    Create a temporary entity which is not saved to the world database. Default is false.
     * @param [options.renderSheet]  Display the sheet for each created Embedded Entities once created.
     * @param [options.noHook]       Block the dispatch of preUpdate hooks for this operation.
     *
     * @return  A Promise which resolves to the created embedded Data once the creation request is successful
     *
     * @example
     * const actor = game.actors.get("dfv934kj23lk6h9k");
     * const data = {name: "Magic Sword", type: "weapon", img: "path/to/icon.png"};
     * const created = await actor.createEmbeddedEntity("OwnedItem", data); // Returns one EmbeddedEntity, saved to the Actor
     * const temp = await actor.createEmbeddedEntity("OwnedItem", data, {temporary: true}); // Not saved to the Actor
     *
     * @example
     * const actor = game.actors.get("dfv934kj23lk6h9k");
     * const data = [{name: "Mace of Crushing", type: "weapon"}, {name: "Shield of Defense", type: "armor"}];
     * const created = await actor.createEmbeddedEntity("OwnedItem", data); // Returns an Array of EmbeddedEntities, saved to the Actor
     * const temp = await actor.createEmbeddedEntity("OwnedItem", data, {temporary: true}); // Not saved to the Actor
     */
    createEmbeddedEntity<E extends BaseEntityData>(
        embeddedName: string,
        data: Partial<E>[] | E[],
        options?: EntityCreateOptions,
    ): Promise<E | E[] | null>;
    createEmbeddedEntity<E extends BaseEntityData>(
        embeddedName: string,
        data: Partial<E> | E,
        options?: EntityCreateOptions,
    ): Promise<E | null>;

    /**
     * Update one or multiple existing entities using provided input data.
     * Data may be provided as a single object to update one Entity, or as an Array of Objects.
     * @static
     *
     * @param embeddedName      The name of the Embedded Entity class to create
     * @param data              A Data object or array of Data. Each element must contain the _id of an existing Entity.
     * @param options           Additional options which customize the update workflow
     * @param [options.diff]    Difference the provided data against the current to eliminate unnecessary changes.
     * @param [options.noHook]  Block the dispatch of preUpdate hooks for this operation.
     *
     * @return  The updated Entity or array of Entities
     *
     * @example
     * const actor = game.actors.get("dfv934kj23lk6h9k");
     * const item = actor.data.items.find(i => i.name === "Magic Sword");
     * const update = {_id: item._id, name: "Magic Sword +1"};
     * const updated = await actor.updateEmbeddedEntity("OwnedItem", update); // Updates one EmbeddedEntity
     *
     * @example
     * const actor = game.actors.get("dfv934kj23lk6h9k");
     * const weapons = actor.data.items.filter(i => i.type === "weapon");
     * const updates = weapons.map(i => {
     *     return {_id: i._id, name: i.name + "+1"};
     * }
     * const updated = await actor.createEmbeddedEntity("OwnedItem", updates); // Updates multiple EmbeddedEntity objects
     */
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<BaseEntityData>;
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<BaseEntityData | BaseEntityData[]>;

    /**
     * Delete one or multiple existing EmbeddedEntity objects using provided input data.
     * Data may be provided as a single id to delete one object or as an Array of string ids.
     * @static
     *
     * @param embeddedName      The name of the Embedded Entity class to create
     * @param data              A Data object or array of Data. Each element must contain the _id of an existing Entity.
     * @param options           Additional options which customize the update workflow
     * @param [options.noHook]  Block the dispatch of preUpdate hooks for this operation.
     *
     * @return  The deleted Embedded Entities
     *
     * @example
     * const actor = game.actors.get("dfv934kj23lk6h9k");
     * const item = actor.data.items.find(i => i.name === "Magic Sword");
     * const deleted = await actor.deleteEmbeddedEntity("OwnedItem", item._id); // Deletes one EmbeddedEntity
     *
     * @example
     * const actor = game.actors.get("dfv934kj23lk6h9k");
     * const weapons = actor.data.items.filter(i => i.type === "weapon");
     * const deletions = weapons.map(i => i._id);
     * const deleted = await actor.deleteEmbeddedEntity("OwnedItem", deletions); // Deletes multiple EmbeddedEntity objects
     */
    deleteEmbeddedEntity(embeddedName: string, dataId: string, options?: EntityDeleteOptions): Promise<BaseEntityData>;
    deleteEmbeddedEntity(
        embeddedName: string,
        dataId: string[],
        options?: EntityDeleteOptions,
    ): Promise<BaseEntityData | BaseEntityData[]>;

    /**
     * Handle Embedded Entity creation within this Entity with specific callback steps.
     * This callback function is triggered by Collection._createEmbeddedEntity once the source data is updated.
     */
    protected _onCreateEmbeddedEntity(response: any): void;

    /**
     * Handle Embedded Entity update within this Entity with specific callback steps.
     * This callback function is triggered by Collection._updateEmbeddedEntity once the source data is updated.
     */
    protected _onUpdateEmbeddedEntity(response: any): void;

    /**
     * Handle Embedded Entity deletion within this Entity with specific callback steps.
     * This callback function is triggered by Collection._deleteEmbeddedEntity once the source data is updated.
     */
    protected _onDeleteEmbeddedEntity(response: any): void;

    /**
     * A generic helper since we take the same actions for every type of Embedded Entity update
     */
    protected _onModifyEmbeddedEntity({
        embeddedName,
        renderContext,
    }: {
        embeddedName: string;
        renderContext: object;
    }): void;

    /* -------------------------------------------- */
    /*  Data Flags                                  */
    /* -------------------------------------------- */

    /**
     * Get the value of a "flag" for this Entity
     * See the setFlag method for more details on flags
     *
     * @param scope	The flag scope which namespaces the key
     * @param key	The flag key
     * @return		The flag value
     */
    getFlag(scope: string, key: string): any;

    /**
     * Assign a "flag" to this Entity.
     * Flags represent key-value type data which can be used to store flexible or arbitrary data required by either
     * the core software, game systems, or user-created modules.
     *
     * Each flag should be set using a scope which provides a namespace for the flag to help prevent collisions.
     *
     * Flags set by the core software use the "core" scope.
     * Flags set by game systems or modules should use the canonical name attribute for the module
     * Flags set by an individual world should "world" as the scope.
     *
     * Flag values can assume almost any data type. Setting a flag value to null will delete that flag.
     *
     * @param scope	The flag scope which namespaces the key
     * @param key	The flag key
     * @param value	The flag value
     *
     * @return		A Promise resolving to the updated Entity
     */
    setFlag(scope: string, key: string, value: any): Promise<Entity>;

    /**
     * Remove a flag assigned to the Entity
     * @param scope	The flag scope which namespaces the key
     * @param key	The flag key
     * @return		A Promise resolving to the updated Entity
     */
    unsetFlag(scope: string, key: string): Promise<Entity>;

    /* -------------------------------------------- */
    /*  Sorting                                     */
    /* -------------------------------------------- */

    /**
     * Sort this Entity relative a target by providing the target, an Array of siblings and other options.
     * See SortingHelper.performIntegerSort for more details
     */
    sortRelative({
        target,
        siblings,
        sortKey,
        sortBefore,
        updateData,
    }: {
        target?: any;
        siblings?: any[];
        sortKey?: string;
        sortBefore?: boolean;
        updateData?: any;
    }): void;

    /* -------------------------------------------- */
    /*  Saving and Loading
	/* -------------------------------------------- */

    /**
     * Clone an Entity, creating a new Entity using the current data as well as provided creation overrides.
     *
     * @param createData	Additional data which overrides current Entity data at the time of creation
     * @param options		Additional creation options passed to the Entity.create method
     * @returns				A Promise which resolves to the created clone Entity
     */
    clone(createData?: object, options?: EntityCreateOptions): Promise<this>;

    /**
     * Export entity data to a JSON file which can be saved by the client and later imported into a different session
     */
    exportToJSON(): any;

    /**
     * A helper function to handle obtaining the dropped Entity data from a dropped event. Entity drop data could have:
     * 1. A compendium pack and entry id
     * 2. A World Entity _id
     * 3. A data object explicitly provided
     *
     * @param data  The data object extracted from a DataTransfer event
     * @return  The Entity data that should be handled by the drop handler
     */
    static fromDropData<TE extends typeof Entity>(this: TE, data: object): Promise<InstanceType<TE>>;

    /**
     * Import data and update this entity
     * @param json	JSON data string
     * @return		The updated Entity
     */
    importFromJSON(json: string): Promise<this>;

    /**
     * Render an import dialog for updating the data related to this Entity through an exported JSON file
     */
    importFromJSONDialog(): Promise<void>;

    /**
     * Serializing an Entity should simply serialize it's inner data, not the entire instance
     */
    toJSON(): this['data'];

    /**
     * Test whether a given User has permission to perform some action on this Entity
     * @alias Entity.can
     */
    static can(user: User, action: string, target: Entity): boolean;

    /**
     * Activate the Socket event listeners used to receive responses from events which modify database documents
     * @param socket   The active game socket
     */
    static activateSocketListeners(socket: any): unknown;

    can(user: User, action: string): boolean;
}
