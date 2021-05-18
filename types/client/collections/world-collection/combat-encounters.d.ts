/**
 * The Collection of Combat documents which exist within the active World.
 * This Collection is accessible within the Game object as game.combats.
 *
 * @see {@link Combat} The Combat entity
 * @see {@link CombatTracker} The CombatTracker sidebar directory
 */
declare class CombatEncounters<C extends Combat> extends WorldCollection<C> {
    get documentName(): 'Folder';

    /** The currently active Combat instance */
    active: C;

    /**
     * Get an Array of Combat instances which apply to the current canvas scene
     */
    combats: C[];

    /**
     * Provide the settings object which configures the Combat entity
     */
    get settings(): {};

    /**
     * The currently viewed Combat encounter
     */
    viewed: C;
}
