import { CombatConstructor } from './constructors';

declare global {
    class Combat<TCombatant extends Combatant = Combatant> extends CombatConstructor {
        /** @override */
        constructor(data: PreCreate<foundry.data.CombatSource>, context?: DocumentConstructionContext<Combat>);

        /** Track the sorted turn order of this combat encounter */
        turns: TCombatant[];

        /** Record the current round, turn, and tokenId to understand changes in the encounter state */
        current: {
            round: number | null;
            turn: number | null;
            tokenId: string | null;
            combatantId: string | null;
        };

        /** Track the previous round, turn, and tokenId to understand changes in the encounter state */
        previous: {
            round: number | null;
            turn: number | null;
            tokenId: string | null;
            combatantId: string | null;
        };

        /** Track whether a sound notification is currently being played to avoid double-dipping */
        protected _soundPlaying: boolean;

        /** The configuration setting used to record Combat preferences */
        static CONFIG_SETTING: 'combatTrackerConfig';

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Get the Combatant who has the current turn. */
        get combatant(): TCombatant | undefined;

        /** The numeric round of the Combat encounter */
        get round(): number;

        /** A reference to the Scene document within which this Combat encounter occurs */
        get scene(): Scene;

        /** Return the object of settings which modify the Combat Tracker behavior */
        get settings(): Record<string, unknown>;

        /** Has this combat encounter been started? */
        get started(): boolean;

        /** The numeric turn of the combat round in the Combat encounter */
        get turn(): number;

        /** @override */
        get visible(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Set the current Combat encounter as active within the Scene.
         * Deactivate all other Combat encounters within the viewed Scene and set this one as active
         */
        activate(): Promise<this>;

        /** Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker */
        endCombat(): Promise<this>;

        /**
         * Get a Combatant using its Token id
         * @param tokenId The id of the Token for which to acquire the combatant
         */
        getCombatantByToken(tokenId: string): TCombatant | undefined;

        /** Advance the combat to the next round */
        nextRound(): Promise<this>;

        /** Advance the combat to the next turn */
        nextTurn(): Promise<this>;

        /** @override */
        prepareDerivedData(): void;

        /** Rewind the combat to the previous round */
        previousRound(): Promise<this>;

        /** Rewind the combat to the previous turn */
        previousTurn(): Promise<this>;

        /** Reset all combatant initiative scores, setting the turn back to zero */
        resetAll(): Promise<this>;

        /**
         * Roll initiative for one or multiple Combatants within the Combat entity
         * @param ids A Combatant id or Array of ids for which to roll
         * @param [options={}] Additional options which modify how initiative rolls are created or presented.
         * @param [options.formula]           A non-default initiative formula to roll. Otherwise the system default is used.
         * @param [options.updateTurn=true]   Update the Combat turn after adding new initiative scores to keep the turn on the same Combatant.
         * @param [options.messageOptions={}] Additional options with which to customize created Chat Messages
         * @return A promise which resolves to the updated Combat entity once updates are complete.
         */
        rollInitiative(
            ids: string | string[],
            { formula, updateTurn, messageOptions }?: RollInitiativeOptions,
        ): Promise<this>;

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
        setupTurns(): TCombatant[];

        /** Begin the combat encounter, advancing to round 1 and turn 1 */
        startCombat(): Promise<this>;

        /**
         * Define how the array of Combatants is sorted in the displayed list of the tracker.
         * This method can be overridden by a system or module which needs to display combatants in an alternative order.
         * By default sort by initiative, next falling back to name, lastly tie-breaking by combatant id.
         */
        protected _sortCombatants(a: TCombatant, b: TCombatant): number;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        /** @override */
        _onCreate(data: this['data']['_source'], options: DocumentModificationContext, userId: string): void;

        /** @override */
        _onUpdate(data: DocumentUpdateData<this>, options: DocumentModificationContext, userId: string): void;

        /** @override */
        _onDelete(options: DocumentModificationContext, userId: string): void;

        /** @override */
        _onCreateEmbeddedDocuments(
            type: 'Combatant',
            documents: TCombatant[],
            result: TCombatant['data']['_source'][],
            options: DocumentModificationContext,
            userId: string,
        ): void;

        /** @override */
        _onUpdateEmbeddedDocuments(
            embeddedName: 'Combatant',
            documents: TCombatant[],
            result: TCombatant['data']['_source'][],
            options: DocumentModificationContext,
            userId: string,
        ): void;

        /** @override */
        _onDeleteEmbeddedDocuments(
            embeddedName: 'Combatant',
            documents: TCombatant[],
            result: TCombatant['data']['_source'][],
            options: DocumentModificationContext,
            userId: string,
        ): void;
    }

    interface Combat<TCombatant extends Combatant = Combatant> {
        readonly data: foundry.data.CombatData<this, TCombatant>;

        createEmbeddedDocuments(
            embeddedName: 'Combatant',
            data: PreCreate<TCombatant['data']['_source']>[],
            context?: DocumentModificationContext,
        ): Promise<TCombatant[]>;
    }

    interface RollInitiativeOptions {
        formula?: number | null;
        updateTurn?: boolean;
        messageOptions: DocumentModificationContext;
    }
}
