import WorldCollection, { FromCompendiumOptions } from "../abstract/world-collection.mjs";
import Actor from "../actor.mjs";

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
export default class Actors<TDocument extends Actor<null>> extends WorldCollection<TDocument> {
    /**
     * A mapping of synthetic Token Actors which are currently active within the viewed Scene.
     * Each Actor is referenced by the Token.id.
     */
    get tokens(): Record<string, TDocument | undefined>;

    static override documentName: "Actor";

    override fromCompendium(
        document: TDocument | TDocument["_source"],
        options?: FromCompendiumOptions,
    ): TDocument["_source"];
}
