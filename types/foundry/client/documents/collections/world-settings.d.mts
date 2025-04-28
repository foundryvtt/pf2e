import WorldCollection from "../abstract/world-collection.mjs";
import Setting from "../setting.mjs";

/**
 * The Collection of Setting documents which exist within the active World.
 * This collection is accessible as game.settings.storage.get("world")
 *
 * @see {@link Setting}: The Setting document
 */
export default class WorldSettings extends WorldCollection<Setting> {
    static override documentName: "Setting";

    override get directory(): null;

    /* -------------------------------------------- */
    /* World Settings Methods                       */
    /* -------------------------------------------- */

    /**
     * Return the Setting document with the given key.
     * @param key The setting key
     * @param user For user-scoped settings, the user ID.
     * @returns The Setting
     */
    getSetting(key: string, user?: string | null): Setting;

    /**
     * Return the serialized value of the world setting as a string
     * @param key The setting key
     * @param user For user-scoped settings, the user ID.
     * @returns The serialized setting string
     */
    getItem(key: string, user?: string): string | null;
}
