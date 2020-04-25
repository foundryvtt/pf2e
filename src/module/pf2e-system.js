import { DB } from './system/db.js';

/**
 * Base PF2e system class
 */
export class PF2e {

    /**
     * TODO: need to remove static content from CONFIG that resides in DB
     * TODO: need to restructure en.json file so CONFIG is not needed (duplicate data)
     * TODO: Move mergeObject to db.js? MergeObject needs to be customzied to check for correct overloading.
     * Static content should be in PF2e.DB (en.json and db.js), and only system configuration should go into CONFIG.PF2e.
     */
    constructor() {
        console.log('PF2e System | Initializing static content database');
        this.DB = mergeObject(DB, game.i18n.translations.PF2E); //static content
        this.CONFIG = CONFIG.PF2E; //shorthand
    }

}