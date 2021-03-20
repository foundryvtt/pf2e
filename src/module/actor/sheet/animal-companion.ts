import { CreatureSheetPF2e } from './creature';
import { AnimalCompanionPF2e } from '../animal-companion';
import { SKILL_DICTIONARY } from '../base';

/**
 * @category Other
 */
export class AnimalCompanionSheetPF2e extends CreatureSheetPF2e<AnimalCompanionPF2e> {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes?.concat(['actor', 'animal-companion']),
            width: 650,
            height: 680,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'attributes' }],
        });
        return options;
    }

    get template() {
        return `systems/pf2e/templates/actors/animal-companion-sheet.html`;
    }

    getData() {
        const companion = this.actor;
        // find all owners, which are the list of all potential masters
        const owners = Object.entries(companion.data.permission)
            .filter(([_id, permission]) => permission === CONST.ENTITY_PERMISSIONS.OWNER)
            .flatMap(([userID]) => game.users.get(userID) ?? []);
        const masters = game.actors.entities
            .filter((actor) => ['character', 'npc'].includes(actor.data.type))
            .filter((actor) => actor.hasPerm(game.user, 'OWNER'))
            .filter((actor) => owners.some((owner) => actor.hasPerm(owner, 'OWNER')));
        const skills = SKILL_DICTIONARY;
        // list of abilities that can be selected as spellcasting ability

        return {
            ...super.getData(),
            owners,
            masters,
            skills,
        };
    }

    /** @override */
    protected prepareItems(_actorData: any) {}
}
