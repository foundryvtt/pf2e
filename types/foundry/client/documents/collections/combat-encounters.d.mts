import WorldCollection from "../abstract/world-collection.mjs";
import Combat from "../combat.mjs";

/**
 * The Collection of Combat documents which exist within the active World.
 * This Collection is accessible within the Game object as game.combats.
 *
 * @see {@link Combat} The Combat entity
 * @see {@link CombatTracker} The CombatTracker sidebar directory
 */
export default class CombatEncounters<TCombat extends Combat> extends WorldCollection<TCombat> {
    static override documentName: "Combat";

    /** Provide the settings object which configures the Combat entity */
    static get settings(): object;

    /** Get an Array of Combat instances which apply to the current canvas scene */
    get combats(): TCombat[];

    /** The currently active Combat instance */
    get active(): TCombat | undefined;

    /** The currently viewed Combat encounter */
    get viewed(): TCombat | null;

    /**
     * When a Token is deleted, remove it as a combatant from any combat encounters which included the Token
     * @param sceneId  The Scene id within which a Token is being deleted
     * @param  tokenId The Token id being deleted
     */
    protected _onDeleteToken(sceneId: string, tokenId: string): Promise<void>;
}
