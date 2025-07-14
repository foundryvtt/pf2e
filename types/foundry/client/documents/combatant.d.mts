import CombatantConfig from "@client/applications/sheets/combatant-config.mjs";
import { DatabaseCreateOperation, DatabaseDeleteOperation, DatabaseUpdateOperation } from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { DocumentOwnershipLevel } from "@common/constants.mjs";
import Roll, { Rolled } from "../dice/roll.mjs";
import { BaseCombatant, BaseUser, Combat, TokenDocument, User } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

interface ClientBaseCombatantStatic extends Omit<typeof BaseCombatant, "new">, ClientDocumentStatic {}

declare const ClientBaseCombatant: {
    new <TParent extends Combat | null>(...args: any): BaseCombatant<TParent> & ClientDocument<TParent>;
} & ClientBaseCombatantStatic;

declare interface ClientBaseCombatant<TParent extends Combat | null>
    extends InstanceType<typeof ClientBaseCombatant<TParent>> {}

/**
 * The client-side Combatant document which extends the common BaseCombatant model.
 *
 * @see {@link Combat}                  The Combat document which contains Combatant embedded documents
 * @see {@link CombatantConfig}         The application which configures a Combatant.
 */
export default class Combatant<
    TParent extends Combat | null = Combat | null,
    TTokenDocument extends TokenDocument | null = TokenDocument | null,
> extends ClientBaseCombatant<TParent> {
    /**
     * The token video source image (if any)
     */
    _videoSrc: string | null;

    /** The current value of the special tracked resource which pertains to this Combatant */
    resource: { value: number } | null;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A convenience alias of Combatant#parent which is more semantically intuitive
     */
    get combat(): TParent;

    /**
     * This is treated as a non-player combatant if it has no associated actor and no player users who can control
     * it
     */
    get isNPC(): boolean;

    /**
     * Eschew `ClientDocument`'s redirection to `Combat#permission` in favor of special ownership determination.
     */
    override get permission(): DocumentOwnershipLevel;

    /** Is this Combatant entry currently visible in the Combat Tracker? */
    get isVisible(): boolean;

    /** A reference to the Actor document which this Combatant represents, if any */
    get actor(): NonNullable<TTokenDocument>["actor"];

    /** A reference to the Token document which this Combatant represents, if any */
    get token(): TTokenDocument;

    /** An array of User documents who have ownership of this Document */
    get players(): User[];

    /** Has this combatant been marked as defeated? */
    get isDefeated(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

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
    protected _getInitiativeFormula(): string;

    /**
     * Prepare derived data based on group membership.
     */
    protected _prepareGroup(): void;

    /**
     * Clear the movement history of the Combatant's Token.
     */
    clearMovementHistory(): Promise<void>;

    /* -------------------------------------------- */
    /*  Database Lifecycle Events                   */
    /* -------------------------------------------- */

    static override _preCreateOperation(
        documents: Document[],
        operation: DatabaseCreateOperation<Document | null>,
        user: BaseUser,
    ): Promise<boolean | void>;

    static override _preUpdateOperation(
        documents: Document[],
        operation: DatabaseUpdateOperation<Document | null>,
        user: BaseUser,
    ): Promise<boolean | void>;

    static override _preDeleteOperation(
        documents: Document[],
        operation: DatabaseDeleteOperation<Document | null>,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface Combatant<TParent extends Combat | null> extends ClientBaseCombatant<TParent> {
    get sheet(): CombatantConfig;
}

export {};
