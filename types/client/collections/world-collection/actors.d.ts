/**
 * The Collection of Actor entities.
 *
 * @see {@link Actor} The Actor entity.
 * @see {@link ActorDirectory} All Actors which exist in the world are rendered within the ActorDirectory sidebar tab.
 *
 * @example <caption>Retrieve an existing Actor by its id</caption>
 * let actor = game.actors.get(actorId);
 */
declare class Actors<TActor extends Actor> extends WorldCollection<TActor> {
    get documentName(): 'Actor';

    /**
     * A mapping of synthetic Token Actors which are currently active within the viewed Scene.
     * Each Actor is referenced by the Token.id.
     */
    tokens: { [tokenID: string]: TActor };

    /* -------------------------------------------- */
    /*  Sheet Registration Methods                  */
    /* -------------------------------------------- */

    /**
     * Register an Actor sheet class as a candidate which can be used to display Actors of a given type
     * See EntitySheetConfig.registerSheet for details
     */
    static registerSheet<A extends ActorSheet>(
        scope: string,
        sheetClass: ConstructorOf<A>,
        options?: RegisterSheetOptions,
    ): void;
    /** Unregister an Actor sheet class, removing it from the list of avaliable sheet Applications to use
     * See EntitySheetConfig.unregisterSheet for details
     */
    static unregisterSheet<T extends ActorSheet>(scope: string, sheetClass: ConstructorOf<T>): void;

    /**
     * Return an Array of currently registered sheet classes for this Entity type
     */
    static get registeredSheets(): typeof ActorSheet[];
}
