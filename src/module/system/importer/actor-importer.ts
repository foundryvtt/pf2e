import { CharacterPF2e } from '@actor';
import { ItemPF2e } from '@item';
import { AncestrySource, BackgroundSource, ClassSource } from '@item/data';
import { ABCManagerOptions, AncestryBackgroundClassManager } from '@item/abc/abc-manager';
import { ErrorPF2e } from '@module/utils';

export class ActorImporter {
    /**
     * Adds an ancestry to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {string | AncestrySource} ancestry The english ancestry name as a string or the source of the ancestry item to create
     * @param {ABCManagerOptions} options Additional options that are passed to the ABC-Manager
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addAncestry(
        character: CharacterPF2e,
        ancestry: string | AncestrySource,
        options: ABCManagerOptions,
    ): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Ancestry items can only be added to characters.`);
        }
        if (typeof ancestry === 'string') {
            ancestry = await AncestryBackgroundClassManager.getItemSource('pf2e.ancestries', ancestry);
        }
        return AncestryBackgroundClassManager.addABCItem(ancestry, character, options);
    }

    /**
     * Adds a background to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {string | BackgroundSource} background The english background name as a string or the source of the background item to create
     * @param {ABCManagerOptions} options Additional options that are passed to the ABC-Manager
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addBackground(
        character: CharacterPF2e,
        background: string | BackgroundSource,
        options: ABCManagerOptions,
    ): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Background items can only be added to characters.`);
        }
        if (typeof background === 'string') {
            background = await AncestryBackgroundClassManager.getItemSource('pf2e.backgrounds', background);
        }
        return AncestryBackgroundClassManager.addABCItem(background, character, options);
    }

    /**
     * Adds a class to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {string | ClassSource} cls The english class name as a string or the source of the class item to create
     * @param {ABCManagerOptions} options Additional options that are passed to the ABC-Manager
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addClass(
        character: CharacterPF2e,
        cls: string | ClassSource,
        options: ABCManagerOptions,
    ): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Class items can only be added to characters.`);
        }
        if (typeof cls === 'string') {
            cls = await AncestryBackgroundClassManager.getItemSource('pf2e.classes', cls);
        }
        return AncestryBackgroundClassManager.addABCItem(cls, character, options);
    }
}
