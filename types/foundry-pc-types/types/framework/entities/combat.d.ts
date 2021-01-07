/**
 * The Collection of Combat entities
 */
declare class CombatEncounters<CombatType extends Combat = Combat> extends EntityCollection<Combat> {
    entities: CombatType[];

    /**
     * The currently active Combat instance
     */
    active: CombatType;

    /**
     * Get an Array of Combat instances which apply to the current canvas scene
     */
    combats: CombatType[];

    /**
     * A reference to the world combat configuration settings
     */
    settings: { [key: string]: unknown };

    /**
     * The currently viewed Combat encounter
     */
    viewed: Combat;
}

declare interface CombatantCreateData {
    tokenId: string;
    hidden: boolean;
}

declare interface CombatantData<ActorType extends Actor = Actor> extends BaseEntityData {
    _id: string;
    actor?: ActorType;
    initiative: number | null;
    hidden: boolean;
    token: TokenData<ActorType['data']>;
    tokenId: string;
    owner: boolean;
    permission: number;
    players: User<ActorType>[];
    resource: number;
    visible: boolean;
}

declare interface CombatData<CombatantDataType extends CombatantData = CombatantData> extends BaseEntityData {
    _id: string;
    sort: number;
    scene: string;
    combatants: CombatantDataType[];
    active: boolean;
    round: number;
    turn: number;
}

/**
 * The Combat Entity defines a particular combat encounter which can occur within the game session
 * Combat instances belong to the CombatEncounters collection
 */
declare class Combat<CombatantDataType extends CombatantData = CombatantData> extends Entity {
    /** @override */
    data: CombatData;
    /**
     * Get the data object for the Combatant who has the current turn
     */
    get combatant(): CombatantDataType;

    /**
     * A convenience reference to the Array of combatant data within the Combat entity
     */
    get combatants(): CombatantDataType[];

    /**
     * The numeric round of the Combat encounte
     */
    round: number;

    /**
     * Get the Scene entity for this Combat encounter
     */
    scene: Scene<CombatantDataType['actor'] extends Actor ? CombatantDataType['actor']['data'] : never>;

    /**
     * Return the object of settings which modify the Combat Tracker behavior
     */
    settings: any;

    /**
     * Has this combat encounter been started?
     */
    started: boolean;

    /**
     * The numeric turn of the combat round in the Combat encounter
     */
    turn: number;

    /**
     * Track the sorted turn order of this combat encounter
     */
    turns: any[];

    /**
     * The configuration setting used to record Combat preferences
     * @type
     */
    static CONFIG_SETTING: string;

    /**
     * Set the current Combat encounter as active within the Scene. Deactivate all other Combat encounters within the viewed Scene and set this one as active
     */
    activate(): Promise<this>;

    /**
     * Create a new Combatant embedded entity
     * @see {@link Combat#createEmbeddedEntity}
     */
    createCombatant(
        data: CombatantDataType[] | Partial<CombatantDataType>[],
        options?: EntityCreateOptions,
    ): Promise<CombatantDataType | CombatantDataType[] | null>;
    createCombatant(
        data: Partial<CombatantDataType> | CombatantDataType,
        options?: EntityCreateOptions,
    ): Promise<CombatantDataType | null>;

    createEmbeddedEntity(
        embeddedName: 'Combatant',
        data: Partial<CombatantDataType>[] | CombatantDataType[],
        options?: EntityCreateOptions,
    ): Promise<CombatantDataType | CombatantDataType[] | null>;
    createEmbeddedEntity(
        embeddedName: 'Combatant',
        data: Partial<CombatantDataType> | CombatantDataType,
        options?: EntityCreateOptions,
    ): Promise<CombatantDataType | null>;

    /**
     * @extends {Entity.deleteEmbeddedEntity}
     */
    deleteCombatant(id: string, options?: EntityDeleteOptions): Promise<CombatantDataType>;

    /**
     * Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker
     */
    endCombat(): Promise<void>;

    /**
     * @extends {Entity.getEmbeddedEntity}
     */
    getCombatant(id: string): CombatantDataType;

    /**
     * Get a Combatant using its Token id
     * @param tokenId The id of the Token for which to acquire the combatant
     */
    getCombatantByToken(tokenId: string): CombatantDataType;

    /**
     * Advance the combat to the next round
     */
    nextRound(): Promise<void>;

    /**
     * Advance the combat to the next turn
     */
    nextTurn(): Promise<void>;

    /**
     * Prepare Embedded Entities which exist within the parent Combat.
     * For example, in the case of an Actor, this method is responsible for preparing the Owned Items the Actor contains.
     */
    prepareEmbeddedEntities(): void;

    /**
     * Rewind the combat to the previous round
     */
    previousRound(): Promise<void>;

    /**
     * Rewind the combat to the previous turn
     */
    previousTurn(): Promise<void>;

    /**
     * Roll initiative for all combatants which have not already rolled
     * @param args Additional arguments forwarded to the Combat.rollInitiative method
     * @returns A promise which resolves to the updated Combat entity once updates are complete.
     */
    rollAll(...args: Parameters<this['rollInitiative']>): Promise<this>;

    /**
     * Roll initiative for one or multiple Combatants within the Combat entity
     * @param ids A Combatant id or Array of ids for which to roll
     * @param formula A non-default initiative formula to roll. Otherwise the system default is used.
     * @param messageOptions Additional options with which to customize created Chat Messages
     * @returns A promise which resolves to the updated Combat entity once updates are complete.
     */
    rollInitiative(
        ids: string | string[],
        {
            formula,
            updateTurn,
            messageOptions,
        }?: {
            formula?: string | null;
            updateTurn?: boolean;
            messageOptions?: EntityCreateOptions;
        },
    ): Promise<this>;

    /**
     * Roll initiative for all non-player actors who have not already rolled
     * @param args Additional arguments forwarded to the Combat.rollInitiative method
     * @returns A promise which resolves to the updated Combat entity once updates are complete.
     */
    rollNPC(...args: Parameters<this['rollInitiative']>): Promise<this>;

    /**
     * Set initiative for a single Combatant within the Combat encounter. Turns will be updated to keep the same combatant as current in the turn order
     * @param id The combatant ID for which to set initiative
     * @param id A specific initiative value to set
     */
    setInitiative(id: string, value: number): Promise<void>;

    /**
     * Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name
     */
    setupTurns(): this['combatants'];

    /**
     * Begin the combat encounter, advancing to round 1 and turn 1
     */
    startCombat(): Promise<this>;

    /**
     * @extends {Entity.updateEmbeddedEntity}
     */
    updateCombatant(data: EntityUpdateData, options?: EntityUpdateOptions): Promise<this['combatant']>;
    updateCombatant(
        data: EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<this['combatant'] | this['combatant'][]>;

    /**
     * Prepare turn data for one specific combatant.
     * @private
     */
    protected _prepareCombatant(
        c: CombatantDataType,
        scene: Scene<CombatantDataType['actor'] extends Actor ? CombatantDataType['actor']['data'] : never>,
        players: User<CombatantDataType['actor'] extends Actor ? CombatantDataType['actor'] : never>[],
        settings: {},
    ): CombatantDataType;

    /**
     * Define how the array of Combatants is sorted in the displayed list of the tracker.
     * This method can be overridden by a system or module which needs to display combatants in an alternative order.
     * By default sort by initiative, falling back to name
     * @private
     */
    protected _sortCombatants(a: CombatantDataType, b: CombatantDataType): number;

    /**
     * Acquire the default dice formula which should be used to roll initiative for a particular combatant.
     * Modules or systems could choose to override or extend this to accommodate special situations.
     * @private
     *
     * @param combatant  Data for the specific combatant for whom to acquire an initiative formula. This
     *                   is not used by default, but provided to give flexibility for modules and systems.
     * @return  The initiative formula to use for this combatant.
     */
    protected _getInitiativeFormula(combatant: CombatantData): string;
}
