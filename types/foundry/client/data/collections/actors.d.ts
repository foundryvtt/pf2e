/**
 * The singleton collection of Actor documents which exist within the active World.
 * This Collection is accessible within the Game object as game.actors.
 * @category - Collections
 *
 * @see {@link Actor} The Actor document
 * @see {@link ActorDirectory} The ActorDirectory sidebar directory
 *
 * @example Retrieve an existing Actor by its id
 * ```js
 * let actor = game.actors.get(actorId);
 * ```
 */
declare class Actors<TActor extends Actor<null>> extends WorldCollection<TActor> {
    /**
     * A mapping of synthetic Token Actors which are currently active within the viewed Scene.
     * Each Actor is referenced by the Token.id.
     */
    get tokens(): Record<string, TActor | undefined>;

    static override documentName: "Actor";

    override fromCompendium(document: TActor | TActor["_source"], options?: FromCompendiumOptions): TActor["_source"];
}

declare interface Actors<TActor extends Actor<null>> extends WorldCollection<TActor> {
    get documentName(): "Actor";
}
