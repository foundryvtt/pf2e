/* global CONST */
class ActorSheetPF2eFamiliar extends ActorSheet {

    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(['actor', 'familiar']),
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "attributes" }],
        });
        return options;
    }

    get template() {
        return 'systems/pf2e/templates/actors/familiar-sheet.html';
    }

    getData() {
        const sheet = super.getData();

        // find all owners, which are the list of all potential masters
        const owners = Object.entries(this.actor.data.permission)
            .filter(([id, permission], idx) => permission === CONST.ENTITY_PERMISSIONS.OWNER)
            .map(([userID, _], idx) => game.users.get(userID));
        (sheet as any).masters = game.actors.entities.filter(actor => ['character', 'npc'].includes(actor.data.type))
            .filter(actor => actor.hasPerm(game.user, "OWNER"))
            .filter(actor => owners.some(owner => actor.hasPerm(owner, "OWNER")));

        return sheet;
    }

    // Events
    activateListeners(html) {
        super.activateListeners(html);
    }
}

export default ActorSheetPF2eFamiliar;
