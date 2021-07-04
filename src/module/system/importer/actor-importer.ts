import { CharacterPF2e } from '@actor';
import { ItemPF2e } from '@item';
import { AncestrySource, BackgroundSource, ClassSource } from '@item/data';
import { AncestryBackgroundClassManager } from '@item/abc/abc-manager';
import { ErrorPF2e } from '@module/utils';

export class ActorImporter {
    /**
     * Adds an ancestry to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {AncestrySource} ancestrySource The source of the ancestry item to create
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addAncestry(character: CharacterPF2e, ancestrySource: AncestrySource): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Ancestry items can only be added to characters.`);
        }
        return AncestryBackgroundClassManager.addABCItem(ancestrySource, character);
    }

    /**
     * Adds a background to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {BackgroundSource} backgroundSource The source of the background item to create
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addBackground(character: CharacterPF2e, backgroundSource: BackgroundSource): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Background items can only be added to characters.`);
        }
        return AncestryBackgroundClassManager.addABCItem(backgroundSource, character);
    }

    /**
     * Adds a class to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {ClassSource} classSource The source of the class item to create
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addClass(character: CharacterPF2e, classSource: ClassSource): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Class items can only be added to characters.`);
        }
        return AncestryBackgroundClassManager.addABCItem(classSource, character);
    }
}
