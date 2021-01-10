/**
 * The Collection of Combat entities
 */
declare class CombatEncounters<ActorType extends Actor> extends Collection<Combat<ActorType>> {
    entities: Combat<ActorType>[];

    values(): IterableIterator<Combat<ActorType>>;

    /**
     * The currently active Combat instance
     */
    active: Combat<ActorType>;

    /**
     * Get an Array of Combat instances which apply to the current canvas scene
     */
    combats: Combat<ActorType>[];

    /**
     * A reference to the world combat configuration settings
     */
    settings: any;

    /**
     * The currently viewed Combat encounter
     */
    viewed: Combat<ActorType>;
}

declare interface CombatantData<ActorType extends Actor> extends BaseEntityData {
    _id: string;
    actor: ActorType;
    tokenId: string;
    initiative: number | null;
    hidden: boolean;
    token: TokenData;
    owner: boolean;
    permission: number;
    players: User<ActorType>[];
    resource: number;
    visible: boolean;
}

declare interface CombatData<ActorType extends Actor = Actor> extends BaseEntityData {
    _id: string;
    sort: number;
    scene: string;
    combatants: CombatantData<ActorType>[];
    active: boolean;
    round: number;
    turn: number;
}

/**
 * The Combat Entity defines a particular combat encounter which can occur within the game session
 * Combat instances belong to the CombatEncounters collection
 */
declare class Combat<ActorType extends Actor> extends Entity {
    /** @override */
    data: CombatData<ActorType>;
    /**
     * Get the data object for the Combatant who has the current turn
     */
    combatant: CombatantData<ActorType>;

    /**
     * A convenience reference to the Array of combatant data within the Combat entity
     */
    combatants: CombatantData<ActorType>[];

    /**
     * The numeric round of the Combat encounte
     */
    round: number;

    /**
     * Get the Scene entity for this Combat encounter
     */
    scene: Scene;

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
     * Set the current Combat encounter as active within the Scene. Deactivate all other Combat encounters within the viewed Scene and set this one as active
     */
    activate(): Promise<Combat<ActorType>>;

    /**
     * @extends {Entity.createEmbeddedEntity}
     */
    createCombatant(): Promise<CombatantData<ActorType>>;

    /**
     * @extends {Entity.deleteEmbeddedEntity}
     */
    deleteCombatant(): Promise<CombatantData<ActorType>>;

    /**
     * Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker
     */
    endCombat(): Promise<void>;

    /**
     * @extends {Entity.getEmbeddedEntity}
     */
    getCombatant(id: string): Promise<CombatantData<ActorType>>;

    /**
     * Get a Combatant using its Token id
     * @param tokenId The id of the Token for which to acquire the combatant
     */
    getCombatantByToken(tokenId: string): CombatantData<ActorType>;

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
    rollAll(...args: Parameters<this['rollInitiative']>): Promise<Combat<ActorType>>;

    /**
     * Roll initiative for one or multiple Combatants within the Combat entity
     * @param ids A Combatant id or Array of ids for which to roll
     * @param formula A non-default initiative formula to roll. Otherwise the system default is used.
     * @param messageOptions Additional options with which to customize created Chat Messages
     * @returns A promise which resolves to the updated Combat entity once updates are complete.
     */
    rollInitiative(ids: string[] | string, formula: string | null, messageOptions: object): Promise<Combat<ActorType>>;

    /**
     * Roll initiative for all non-player actors who have not already rolled
     * @param args Additional arguments forwarded to the Combat.rollInitiative method
     * @returns A promise which resolves to the updated Combat entity once updates are complete.
     */
    rollNPC(...args: Parameters<this['rollInitiative']>): Promise<Combat<ActorType>>;

    /**
     * Set initiative for a single Combatant within the Combat encounter. Turns will be updated to keep the same combatant as current in the turn order
     * @param id The combatant ID for which to set initiative
     * @param id A specific initiative value to set
     */
    setInitiative(id: string, value: number): Promise<void>;

    /**
     * Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name
     */
    setupTurns(): any[];

    /**
     * Begin the combat encounter, advancing to round 1 and turn 1
     */
    startCombat(): Promise<any>;

    /**
     * @extends {Entity.updateEmbeddedEntity}
     */
    updateCombatant(): Promise<any>;
}
