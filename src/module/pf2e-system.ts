import { DB } from './system/db';
import './system/measure';

/**
 * Base PF2e system class
 * @category PF2
 */
export class PF2eSystem {
    DB: any;
    CONFIG: any;

    /**
     * TODO: need to remove static content from CONFIG that resides in DB
     * TODO: need to restructure en.json file so CONFIG is not needed (duplicate data)
     * TODO: Move mergeObject to db.js? MergeObject needs to be customzied to check for correct overloading.
     * Static content should be in PF2e.DB (en.json and db.js), and only system configuration should go into CONFIG.PF2e.
     */
    constructor() {
        console.log('PF2e System | Initializing static content database');

        let translated = game.i18n.translations.PF2E;
        if (game.i18n._fallback.PF2E !== undefined) {
            // overload so all untranslated keys are still english
            translated = mergeObject(game.i18n._fallback.PF2E, translated);
        }
        this.DB = mergeObject(DB, translated); // static content
        this.CONFIG = CONFIG.PF2E; // shorthand
    }
}
