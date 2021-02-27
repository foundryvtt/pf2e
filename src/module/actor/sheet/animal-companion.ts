import { ActorSheetPF2eCreature } from './creature';
import { PF2EAnimalCompanion } from '../animal-companion';

/**
 * @category Other
 */
export class ActorSheetPF2eAnimalCompanion extends ActorSheetPF2eCreature<PF2EAnimalCompanion> {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['default'],
            width: 700,
            height: 800,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'attributes' }],
            showUnpreparedSpells: false,
        });
    }

    get template() {
        return `systems/pf2e/templates/actors/animal-companion-sheet.html`;
    }
    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Character sheets
     * @private
     */
    _prepareItems(_actorData: any) {}
}
