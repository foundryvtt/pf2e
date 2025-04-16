import WorldCollection from "../abstract/world-collection.mjs";
import Cards from "../cards.mjs";

/**
 * The collection of Cards documents which exist within the active World.
 * This Collection is accessible within the Game object as game.cards.
 * @category Collections
 *
 * @see {@link foundry.documents.Cards}: The Cards document
 * @see {@link foundry.applications.sidebar.tabs.CardsDirectory}: The CardsDirectory sidebar directory
 */
export default class CardStacks extends WorldCollection<Cards> {
    static override documentName: "Cards";
}
