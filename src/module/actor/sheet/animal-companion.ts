import { ActorSheetPF2eCreature } from './creature';
import { ItemData } from '../../item/data-definitions';
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

    async _updateObject(event: Event, formData: any): Promise<void> {
        await super._updateObject(event, formData);
    }

    /**
     * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
     */
    getData() {
        const sheetData = super.getData();
        // Return data for rendering
        return sheetData;
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Character sheets
     * @private
     */
    _prepareItems(_actorData: any) {}

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
  /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
     */
    activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);
    }

    async _onDropItemCreate(itemData: ItemData): Promise<any> {
        return super._onDropItemCreate(itemData);
    }
}
