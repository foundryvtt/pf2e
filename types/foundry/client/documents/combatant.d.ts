import { CombatantConstructor } from "./constructors";

declare global {
    /**
     * The Combatant embedded document within a Combat document which extends the BaseRollTable abstraction.
     * Each Combatant belongs to the effects collection of its parent Document.
     * Each Combatant contains a CombatantData object which provides its source data.
     *
     * @see {@link data.CombatantData} The Combatant data schema
     * @see {@link documents.Combat}   The Combat document which contains Combatant embedded documents
     */
    class Combatant<
        TParent extends Combat | null = Combat | null,
        TActor extends Actor | null = Actor | null
    > extends CombatantConstructor {
        constructor(data: PreCreate<foundry.data.CombatantSource>, context?: DocumentConstructionContext<Combatant>);

        /** A cached reference to the Token which this Combatant represents, if any */
        protected _token: NonNullable<TActor>["parent"];

        /** A cached reference to the Actor which this Combatant represents, if any */
        protected _actor: TActor;

        /** The current value of the special tracked resource which pertains to this Combatant */
        resource: { value: number } | null;

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /**
         * Determine the image icon path that should be used to portray this Combatant in the combat tracker or
         * elsewhere
         */
        get img(): VideoFilePath;

        /**
         * This is treated as a non-player combatant if it has no associated actor and no player users who can control
         * it
         */
        get isNPC(): boolean;

        override get isOwner(): boolean;

        /** Is this Combatant entry currently visible in the Combat Tracker? */
        get isVisible(): boolean;

        /** A reference to the Actor document which this Combatant represents, if any */
        get actor(): TActor;

        /** A reference to the Token document which this Combatant represents, if any */
        get token(): NonNullable<TActor>["parent"];

        /** An array of User documents who have ownership of this Document */
        get players(): User[];

        /** Has this combatant been marked as defeated? */
        get isDefeated(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override testUserPermission(
            user: foundry.documents.BaseUser,
            permission: DocumentOwnershipString | DocumentOwnershipLevel,
            { exact }?: { exact?: boolean }
        ): boolean;

        /**
         * Get a Roll object which represents the initiative roll for this Combatant.
         * @param formula An explicit Roll formula to use for the combatant.
         * @return The Roll instance to use for the combatant.
         */
        getInitiativeRoll(formula: string): Roll;

        /**
         * Roll initiative for this particular combatant.
         * @param [formula] A dice formula which overrides the default for this Combatant.
         * @return The Roll instance to use for the combatant.
         */
        rollInitiative(formula: string): Rolled<Roll>;

        override prepareDerivedData(): void;

        /** Update the value of the tracked resource for this Combatant. */
        updateResource(): { value: number } | null;

        /**
         * Acquire the default dice formula which should be used to roll initiative for this combatant.
         * Modules or systems could choose to override or extend this to accommodate special situations.
         * @return The initiative formula to use for this combatant.
         */
        _getInitiativeFormula(): string;
    }

    interface Combatant<TParent extends Combat | null = Combat | null, TActor extends Actor | null = Actor | null> {
        readonly data: foundry.data.CombatantData<this>;

        readonly parent: TParent;

        _sheet: CombatantConfig<this>;
    }
}
