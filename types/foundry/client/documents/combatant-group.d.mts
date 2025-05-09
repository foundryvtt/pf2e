import BaseCombatantGroup from "@common/documents/combatant-group.mjs";
import { Combat, Combatant } from "./_module.mjs";
import { ClientDocument } from "./abstract/client-document.mjs";

declare const ClientBaseCombatantGroup: new <TParent extends Combat | null>(
    ...args: any
) => BaseCombatantGroup<TParent> & ClientDocument<TParent>;

interface ClientBaseCombatantGroup<TParent extends Combat | null>
    extends InstanceType<typeof ClientBaseCombatantGroup<TParent>> {}

/**
 * The client-side CombatantGroup document which extends the common BaseCombatantGroup model.
 *
 * @see {@link foundry.documents.Combat}: The Combat document which contains Combatant embedded documents
 */
export default class CombatantGroup<
    TParent extends Combat | null = Combat | null,
> extends ClientBaseCombatantGroup<TParent | null> {
    /**
     * A group is considered defeated if all its members are defeated, or it has no members.
     */
    defeated: boolean;

    /**
     * A group is considered hidden if all its members are hidden, or it has no members.
     */
    hidden: boolean;

    /**
     * The Combatant members of this group.
     */
    members: Set<Combatant>;

    prepareBaseData(): void;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Clear the movement history of all Tokens within this Combatant Group.
     */
    clearMovementHistories(): Promise<void>;
}

export {};
