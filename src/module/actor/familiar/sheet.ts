import { SaveString, SkillAbbreviation } from '@actor/creature/data';
import { SKILL_DICTIONARY } from '@actor/data/values';
import { FamiliarPF2e } from '@actor/familiar';
import type { ItemPF2e } from '@item/base';

/**
 * @category Actor
 */
export class FamiliarSheetPF2e extends ActorSheet<FamiliarPF2e, ItemPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes?.concat('familiar'),
            width: 650,
            height: 680,
            tabs: [{ navSelector: '.sheet-navigation', contentSelector: '.sheet-content', initial: 'attributes' }],
        });
        return options;
    }

    override get template() {
        return 'systems/pf2e/templates/actors/familiar-sheet.html';
    }

    override getData() {
        const familiar = this.actor;
        // find all owners, which are the list of all potential masters
        const owners = Object.entries(familiar.data.permission)
            .filter(([_id, permission]) => permission === CONST.ENTITY_PERMISSIONS.OWNER)
            .flatMap(([userID]) => game.users.get(userID) ?? []);
        const masters = game.actors
            .filter((actor) => ['character', 'npc'].includes(actor.data.type))
            .filter((actor) => actor.testUserPermission(game.user, 'OWNER'))
            .filter((actor) => owners.some((owner) => actor.testUserPermission(owner, 'OWNER')));

        // list of abilities that can be selected as spellcasting ability
        const abilities = CONFIG.PF2E.abilities;

        const size = CONFIG.PF2E.actorSizes[familiar.data.data.traits.size.value] ?? null;
        const familiarAbilities = this.actor.master?.attributes?.familiarAbilities ?? {
            value: 0,
            breakdown: '',
        };

        const familiarTraits: Record<string, string> = CONFIG.PF2E.monsterTraits;
        const traitDescriptions: Record<string, string> = CONFIG.PF2E.traitsDescriptions;

        const traits = Array.from(this.actor.data.data.traits.traits.value)
            .map((trait) => ({
                value: trait,
                label: familiarTraits[trait] ?? trait,
                description: traitDescriptions[trait] ?? '',
            }))
            .sort();

        // TEMPORARY solution for change in 0.8 where actor in super.getData() is an object instead of the data.
        // The correct solution is to subclass ActorSheetPF2e, but that is a more involved fix.
        const actorData = this.actor.toObject(false);
        const baseData = super.getData() as any;
        baseData.actor = actorData;
        baseData.data = actorData.data;

        return {
            ...baseData,
            owners,
            master: this.actor.master,
            masters,
            abilities,
            size,
            familiarAbilities,
            traits,
        };
    }

    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        // rollable stats
        html.find('[data-saving-throw]:not([data-saving-throw=""])').on('click', '*', (event) => {
            const save = $(event.currentTarget).closest('[data-saving-throw]').attr('data-saving-throw') as SaveString;
            const options = this.actor.getRollOptions(['all', 'saving-throw', save]);
            this.actor.data.data.saves[save].roll(event, options);
        });

        html.find('[data-skill-check]:not([data-skill-check=""])').on('click', '*', (event) => {
            const skill = $(event.currentTarget)
                .closest('[data-skill-check]')
                .attr('data-skill-check') as SkillAbbreviation;
            const options = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[skill] ?? skill]);
            this.actor.data.data.skills[skill].roll(event, options);
        });

        html.find('[data-perception-check]').on('click', '*', (event) => {
            const options = this.actor.getRollOptions(['all', 'perception']);
            this.actor.attributes.perception.roll({ event, options });
        });

        html.find('[data-attack-roll]').on('click', '*', (event) => {
            const options = this.actor.getRollOptions(['all', 'attack']);
            (this.actor.data.data as any).attack.roll(event, options);
        });

        // expand and condense item description
        html.find('.item-list').on('click', '.expandable', (event) => {
            $(event.currentTarget).removeClass('expandable').addClass('expanded');
        });

        html.find('.item-list').on('click', '.expanded', (event) => {
            $(event.currentTarget).removeClass('expanded').addClass('expandable');
        });

        if (!this.isEditable) return;

        // item controls
        html.find('.item-list').on('click', '[data-item-id]:not([data-item-id=""]) .item-edit', (event) => {
            const itemID = $(event.currentTarget).closest('[data-item-id]').attr('data-item-id');
            const item = this.actor.items.get(itemID ?? '');
            if (item) {
                item.sheet.render(true);
            }
        });

        html.find('.item-list').on('click', '[data-item-id]:not([data-item-id=""]) .item-delete', (event) => {
            const itemID = $(event.currentTarget).closest('[data-item-id]').attr('data-item-id') ?? '';
            const item = this.actor.items.get(itemID);
            if (!item) return;

            new Dialog({
                title: `Remove ${item.type}?`,
                content: `<p>Are you sure you want to remove ${item.name}?</p>`,
                buttons: {
                    delete: {
                        icon: '<i class="fas fa-trash"></i>',
                        label: 'Remove',
                        callback: () => {
                            item.delete();
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'cancel',
            }).render(true);
            return false;
        });
    }
}
