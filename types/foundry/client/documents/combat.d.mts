import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseDeleteOperation,
    DatabaseUpdateCallbackOptions,
    DatabaseUpdateOperation,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import EmbeddedCollection from "@common/abstract/embedded-collection.mjs";
import { ChatMessageCreateOperation } from "@common/documents/chat-message.mjs";
import BaseCombat from "@common/documents/combat.mjs";
import { Combatant, TokenDocument, User } from "./_module.mjs";
import { CombatTurnEventContext } from "./_types.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

type BaseCombatStatic = typeof BaseCombat;
interface ClientBaseCombatStatic extends BaseCombatStatic, ClientDocumentStatic {}

declare const ClientBaseCombat: {
    new (...args: any): BaseCombat & ClientDocument<null>;
} & ClientBaseCombatStatic;

interface ClientBaseCombat extends InstanceType<typeof ClientBaseCombat> {}

/**
 * The Combat model definition which defines common behavior of an Combat document between both client and server.
 * Each Combat document contains CombatData which defines its data schema.
 * @param [data={}] Initial data provided to construct the Combat document
 */
export default class Combat extends ClientBaseCombat {
    /** Track the sorted turn order of this combat encounter */
    turns: CollectionValue<this["combatants"]>[];

    /** Record the current round, turn, and tokenId to understand changes in the encounter state */
    current: CombatHistoryData;

    /** Track the previous round, turn, and tokenId to understand changes in the encounter state */
    previous: CombatHistoryData;

    /** The configuration setting used to record Combat preferences */
    static CONFIG_SETTING: "combatTrackerConfig";

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** Get the Combatant who has the current turn. */
    get combatant(): CollectionValue<this["combatants"]> | undefined;

    /** Return the object of settings which modify the Combat Tracker behavior */
    get settings(): Record<string, unknown>;

    /** Has this combat encounter been started? */
    get started(): boolean;

    override get visible(): true;

    /** Is this combat active in the current scene? */
    get isActive(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Set the current Combat encounter as active within the Scene.
     * Deactivate all other Combat encounters within the viewed Scene and set this one as active
     */
    activate(): Promise<[this]>;

    override prepareDerivedData(): void;

    /**
     * Get a Combatant using its Token id
     * @param tokenId The id of the Token for which to acquire the combatant
     */
    getCombatantByToken(tokenId: string): Combatant<this> | undefined;

    /**
     * Get a Combatant using its Actor id
     * @param actorId The id of the Actor for which to acquire the combatant
     */
    getCombatantByActor(actorId: string): Combatant<this> | undefined;

    /**
     * Calculate the time delta between two turns.
     * @param fromRound The from-round
     * @param fromTurn The from-turn
     * @param toRound The to-round
     * @param toTurn The to-turn
     * @returns The time delta
     */
    getTimeDelta(fromRound: number, fromTurn: number | null, toRound: number, toTurn: number | null): number;

    /** Begin the combat encounter, advancing to round 1 and turn 1 */
    startCombat(): Promise<this>;

    /** Advance the combat to the next round */
    nextRound(): Promise<this>;

    /** Advance the combat to the next turn */
    nextTurn(): Promise<this>;

    override prepareDerivedData(): void;

    /** Rewind the combat to the previous round */
    previousRound(): Promise<this>;

    /** Rewind the combat to the previous turn */
    previousTurn(): Promise<this>;

    /** Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker */
    endCombat(): Promise<this>;

    /** Toggle whether this combat is linked to the scene or globally available. */
    toggleSceneLink(): Promise<this>;

    /** Reset all combatant initiative scores, setting the turn back to zero */
    resetAll(): Promise<this>;

    /**
     * Roll initiative for one or multiple Combatants within the Combat entity
     * @param ids A Combatant id or Array of ids for which to roll
     * @param options Additional options which modify how initiative rolls are created or presented.
     * @param options.formula A non-default initiative formula to roll. Otherwise the system default is used.
     * @param options.updateTurn Update the Combat turn after adding new initiative scores to keep the turn on the same Combatant.
     * @param options.messageOptions Additional options with which to customize created Chat Messages
     * @return A promise which resolves to the updated Combat entity once updates are complete.
     */
    rollInitiative(ids: string | string[], options?: RollInitiativeOptions): Promise<this>;

    /**
     * Roll initiative for all combatants which have not already rolled
     * @param [options={}] Additional options forwarded to the Combat.rollInitiative method
     */
    rollAll(options?: RollInitiativeOptions): Promise<this>;

    /**
     * Roll initiative for all non-player actors who have not already rolled
     * @param [options={}] Additional options forwarded to the Combat.rollInitiative method
     */
    rollNPC(options?: RollInitiativeOptions): Promise<this>;

    /**
     * Assign initiative for a single Combatant within the Combat encounter.
     * Update the Combat turn order to maintain the same combatant as the current turn.
     * @param id    The combatant ID for which to set initiative
     * @param value A specific initiative value to set
     */
    setInitiative(id: string, value: number): Promise<void>;

    /** Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name. */
    setupTurns(): Combatant<this>[];

    /**
     * Debounce changes to the composition of the Combat encounter to de-duplicate multiple concurrent Combatant changes.
     * If this is the currently viewed encounter, re-render the CombatTracker application.
     */
    debounceSetup: () => void;

    /**
     * Update active effect durations for all actors present in this Combat encounter.
     */
    updateCombatantActors(): void;

    /**
     * Loads the registered Combat Theme (if any) and plays the requested type of sound.
     * If multiple exist for that type, one is chosen at random.
     * @param announcement The announcement that should be played: "startEncounter", "nextUp", or "yourTurn".
     */
    protected _playCombatSound(announcement: string): void;

    /**
     * Define how the array of Combatants is sorted in the displayed list of the tracker.
     * This method can be overridden by a system or module which needs to display combatants in an alternative order.
     * By default sort by initiative, next falling back to name, lastly tie-breaking by combatant id.
     */
    protected _sortCombatants(a: Combatant<this>, b: Combatant<this>): number;

    /**
     * Refresh the Token HUD under certain circumstances.
     * @param documents  A list of Combatant documents that were added or removed.
     */
    protected _refreshTokenHUD(documents: Combatant<this>[]): void;

    /**
     * Clear the movement history of the Combatants' Tokens.
     * @param combatants The combatants whose movement history is cleared
     */
    clearMovementHistories(combatants?: Iterable<Combatant<this>>): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /* -------------------------------------------- */
    /*  Combatant Management Workflows              */
    /* -------------------------------------------- */

    protected override _onCreateDescendantDocuments(
        parent: this,
        collection: "combatants",
        documents: Combatant<this>[],
        data: Combatant<this>["_source"][],
        operation: DatabaseCreateOperation<this>,
        userId: string,
    ): void;
    protected override _onCreateDescendantDocuments<TParent extends Document>(
        parent: TParent,
        collection: string,
        documents: ClientDocument<TParent>,
        data: object[],
        options: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdateDescendantDocuments(
        parent: this,
        collection: "combatants",
        documents: Combatant<this>[],
        changes: DeepPartial<Combatant<this>["_source"]>[],
        operation: DatabaseUpdateOperation<this>,
        userId: string,
    ): void;
    protected override _onUpdateDescendantDocuments<TParent extends Document>(
        parent: TParent,
        collection: string,
        documents: Document<TParent>[],
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDeleteDescendantDocuments(
        parent: this,
        collection: "combatants",
        documents: Combatant<this>[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void;
    protected override _onDeleteDescendantDocuments<TParent extends Document>(
        parent: TParent,
        collection: string,
        documents: Document<TParent>[],
        ids: string[],
        options: DatabaseDeleteOperation<TParent>,
        userId: string,
    ): void;

    /**
     * This workflow occurs after a Combatant is added to the Combat.
     * This can be overridden to implement system-specific combat tracking behaviors.
     * The default implementation of this function does nothing.
     * This method only executes for one designated GM user. If no GM users are present this method will not be called.
     * @param combatant The Combatant that entered the Combat
     */
    protected _onEnter(combatant: Combatant): Promise<void>;

    /**
     * This workflow occurs after a Combatant is removed from the Combat.
     * This can be overridden to implement system-specific combat tracking behaviors.
     * The default implementation of this function does nothing.
     * This method only executes for one designated GM user. If no GM users are present this method will not be called.
     * @param combatant The Combatant that exited the Combat
     */
    protected _onExit(combatant: Combatant<this>): Promise<void>;

    /**
     * Called after {@link Combat#_onExit} and takes care of clearing the movement history of the
     * Combatant's Token.
     * This function is not called for Combatants that don't have a Token.
     * The default implementation clears the movement history always.
     * @param combatant The Combatant that exited the Combat
     */
    protected _clearMovementHistoryOnExit(combatant: Combatant<this>): Promise<void>;

    /**
     * Get the current history state of the Combat encounter.
     * @param [combatant]       The new active combatant
     */
    protected _getCurrentState(combatant?: Combatant<this>): CombatHistoryData;

    /* -------------------------------------------- */
    /*  Turn Events                                 */
    /* -------------------------------------------- */

    /**
     * Manage the execution of Combat lifecycle events.
     * This method orchestrates the execution of four events in the following order, as applicable:
     * 1. End Turn
     * 2. End Round
     * 3. Begin Round
     * 4. Begin Turn
     * Each lifecycle event is an async method, and each is awaited before proceeding.
     * @param [adjustedTurn]   Optionally, an adjusted turn to commit to the Combat.
     */
    protected _manageTurnEvents(adjustedTurn?: number): Promise<void>;

    /**
     * A workflow that occurs at the end of each Combat Turn.
     * This workflow occurs after the Combat document update, prior round information exists in this.previous.
     * This can be overridden to implement system-specific combat tracking behaviors.
     * This method only executes for one designated GM user. If no GM users are present this method will not be called.
     * @param combatant The Combatant whose turn just ended
     */
    protected _onEndTurn(combatant: Combatant<this>): Promise<void>;

    /**
     * A workflow that occurs at the end of each Combat Round.
     * This workflow occurs after the Combat document update, prior round information exists in this.previous.
     * This can be overridden to implement system-specific combat tracking behaviors.
     * This method only executes for one designated GM user. If no GM users are present this method will not be called.
     */
    protected _onEndRound(): Promise<void>;

    /**
     * A workflow that occurs at the start of each Combat Round.
     * This workflow occurs after the Combat document update, new round information exists in this.current.
     * This can be overridden to implement system-specific combat tracking behaviors.
     * This method only executes for one designated GM user. If no GM users are present this method will not be called.
     */
    protected _onStartRound(): Promise<void>;

    /**
     * A workflow that occurs at the start of each Combat Turn.
     * This workflow occurs after the Combat document update, new turn information exists in this.current.
     * This can be overridden to implement system-specific combat tracking behaviors.
     * This method only executes for one designated GM user. If no GM users are present this method will not be called.
     * @param combatant The Combatant whose turn just started
     */
    protected _onStartTurn(combatant: Combatant<this>): Promise<void>;

    /**
     * Called after {@link Combat#_onStartTurn} and takes care of clearing the movement history of the
     * Combatant's Token.
     * This function is not called for Combatants that don't have a Token.
     * The default implementation clears the movement history always.
     * @param combatant The Combatant whose turn just started
     * @param context The context of the turn that just started
     */
    protected _clearMovementHistoryOnStartTurn(
        combatant: Combatant<this>,
        context: CombatTurnEventContext,
    ): Promise<void>;

    /**
     * When Tokens are deleted, handle actions to update/delete Combatants of these Tokens.
     * @param tokens An array of Tokens which have been deleted
     * @param operation The operation that deleted the Tokens
     * @param user The User that deleted the Tokens
     * @internal
     */
    static _onDeleteTokens(tokens: TokenDocument[], operation: DatabaseDeleteCallbackOptions, user: User): void;
}

export default interface Combat extends ClientBaseCombat {
    readonly combatants: EmbeddedCollection<Combatant<this>>;
}

export interface CombatHistoryData {
    round: number | null;
    turn: number | null;
    tokenId: string | null;
    combatantId: string | null;
}

export interface RollInitiativeOptions {
    formula?: number | null;
    updateTurn?: boolean;
    messageOptions?: Partial<ChatMessageCreateOperation>;
}

export {};
