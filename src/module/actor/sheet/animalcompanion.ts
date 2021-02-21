import { ActorSheetPF2eCreature } from './creature';
import { PF2ECharacter } from '../character';
import { ItemData } from '../../item/data-definitions';

/**
 * @category Other
 */
export class ActorSheetPF2EAnimalCompanion extends ActorSheetPF2eCreature<PF2ECharacter> {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['default', 'actor', 'familiar'],
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

        // find all owners, which are the list of all potential masters
        const owners = Object.entries(this.actor.data.permission)
            .filter(([_, permission]) => permission === CONST.ENTITY_PERMISSIONS.OWNER)
            .map(([userID, _]) => game.users.get(userID));

        (sheetData as any).masters = game.actors.entities
            .filter((actor) => ['character', 'npc'].includes(actor.data.type))
            .filter((actor) => actor.hasPerm(game.user, 'OWNER'))
            .filter((actor) => owners.some((owner) => (owner ? actor.hasPerm(owner, 'OWNER') : false)));

        // Temporary HP
        const { hp } = sheetData.data.attributes;
        if (hp.temp === 0) delete hp.temp;
        if (hp.tempmax === 0) delete hp.tempmax;

        const ancestryItem = this.actor.items.find((x) => x.type === 'ancestry');
        sheetData.ancestryItemId = ancestryItem ? ancestryItem.id : '';

        // Return data for rendering
        return sheetData;
    }

    /* -------------------------------------------- */

    /**
     * Organize and classify Items for Character sheets
     * @private
     */
    _prepareItems(actorData) {
        actorData.hasInteractionActions = false; //appeasing betterer, as I need to implement this, but have no use for it yet, but actordata needs to be used
    }

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
