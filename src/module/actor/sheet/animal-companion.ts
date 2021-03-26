import { CreatureSheetPF2e } from './creature';
import { AnimalCompanionPF2e } from '../animal-companion';

/**
 * @category Other
 */
export class AnimalCompanionSheetPF2e extends CreatureSheetPF2e<AnimalCompanionPF2e> {
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

    /** @override */
    protected prepareItems() {}
}
