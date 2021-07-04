import { CharacterPF2e } from '@actor';
import { ABCItemPF2e, ItemPF2e } from '@item';
import { AncestryBackgroundClassManager } from '@item/abc/abc-manager';
import { ErrorPF2e } from '@module/utils';

export class ActorImporter {
    /**
     * Adds ancestry, backgorund or class items to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {ABCItemPF2e} item The item to create
     * @returns {Promise<ItemPF2e[]>} An array of items that were created.
     */
    static async addABCItem(character: CharacterPF2e, item: ABCItemPF2e): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. ABC items can only be added to characters.`);
        }
        return AncestryBackgroundClassManager.addABC(item.toObject(), character);
    }
}
