import { CharacterPF2e } from '@actor';
import { ABCItemPF2e, ItemPF2e } from '@item';
import { AncestrySource, BackgroundSource, ClassSource } from '@item/data';
import { AncestryBackgroundClassManager } from '@item/abc/abc-manager';
import { ErrorPF2e, sluggify } from '@module/utils';

export class ActorImporter {
    /**
     * Adds an ancestry to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {string | AncestrySource} ancestry The english ancestry name as a string or the source of the ancestry item to create
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addAncestry(character: CharacterPF2e, ancestry: string | AncestrySource): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Ancestry items can only be added to characters.`);
        }
        if (typeof ancestry === 'string') {
            ancestry = await this.getItemSource('pf2e.ancestries', ancestry);
        }
        return AncestryBackgroundClassManager.addABCItem(ancestry, character);
    }

    /**
     * Adds a background to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {string | BackgroundSource} background The english background name as a string or the source of the background item to create
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addBackground(character: CharacterPF2e, background: string | BackgroundSource): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Background items can only be added to characters.`);
        }
        if (typeof background === 'string') {
            background = await this.getItemSource('pf2e.backgrounds', background);
        }
        return AncestryBackgroundClassManager.addABCItem(background, character);
    }

    /**
     * Adds a class to a given character. Linked features are created automatically.
     * @param {CharacterPF2e} character The character actor to create the item in
     * @param {string | ClassSource} cls The english class name as a string or the source of the class item to create
     * @returns {Promise<ItemPF2e[]>} A Promise which resolve to an array of the items that were created
     */
    static async addClass(character: CharacterPF2e, cls: string | ClassSource): Promise<ItemPF2e[]> {
        if (!(character instanceof CharacterPF2e)) {
            throw ErrorPF2e(`Invalid Actor type. Class items can only be added to characters.`);
        }
        if (typeof cls === 'string') {
            cls = await this.getItemSource('pf2e.classes', cls);
        }
        return AncestryBackgroundClassManager.addABCItem(cls, character);
    }

    /**
     * Get the item source of a given ancestry, background or class from the appropriate compendium pack
     * @param {string} packName 'pf2e.ancestries' or 'pf2e.backgrounds' or 'pf2e.classes'
     * @param {string} name The supplied english ancestry, background or class name
     * @returns {Promise<AncestrySource | BackgroundSource | ClassSource>} A Promise which resolves to the item source of the item found
     *  in the compendium pack
     */
    protected static async getItemSource(packName: 'pf2e.ancestries', name: string): Promise<AncestrySource>;
    protected static async getItemSource(packName: 'pf2e.backgrounds', name: string): Promise<BackgroundSource>;
    protected static async getItemSource(packName: 'pf2e.classes', name: string): Promise<ClassSource>;
    protected static async getItemSource(
        packName: 'pf2e.ancestries' | 'pf2e.backgrounds' | 'pf2e.classes',
        name: string,
    ): Promise<AncestrySource | BackgroundSource | ClassSource> {
        const slug = sluggify(name);
        const pack = game.packs.get<CompendiumCollection<ABCItemPF2e>>(packName, { strict: true });
        const docs = await pack.getDocuments({ 'data.slug': { $in: [slug] } });
        if (docs.length === 1) {
            return docs[0].toObject();
        } else {
            throw ErrorPF2e(`Cannot find '${name}' in pack '${packName}'`);
        }
    }
}
