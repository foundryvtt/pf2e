import WorldCollection from "../abstract/world-collection.mjs";
import Item from "../item.mjs";

/**
 * The singleton collection of Item documents which exist within the active World.
 * This Collection is accessible within the Game object as game.items.
 *
 * @see {@link Item} The Item document
 * @see {@link ItemDirectory} The ItemDirectory sidebar directory
 */
export default class Items<TItem extends Item<null>> extends WorldCollection<TItem> {
    static override documentName: "Item";
}
