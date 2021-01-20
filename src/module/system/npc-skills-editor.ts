import { PF2ENPC } from '../actor/npc';

/**
 * Specialized form to setup skills for an NPC character.
 */
export class NPCSkillsEditor extends FormApplication<PF2ENPC> {
    npc: PF2ENPC;

    constructor(actor, options) {
        super(actor, options);

        // Process actor and options
        this.npc = actor as PF2ENPC;

        if (this.npc === undefined) {
            console.error(`Trying to use the NPC Skills Editor form with a non-NPC actor.`);
        }
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        options.id = 'npc-skills-selector';
        options.classes = ['pf2e', 'npc'];
        options.title = game.i18n.localize('PF2E.NPC.SkillsEditor.TitleLabel');
        options.template = 'systems/pf2e/templates/actors/npc/forms/npc-skills-editor.html';
        options.width = 'auto';
        options.height = 700;
        options.scrollY = ['.skills-list']; // ???

        return options;
    }

    /**
     * Prepare data to be sent to HTML.
     */
    getData() {
        return {
            ...super.getData(),
            skills: this.object.data.data.skills,
        };
    }

    /**
     * Subscribe to events from HTML.
     * @param html
     */
    activateListeners(html) {
        super.activateListeners(html);

        html.find('.delete').click((ev) => this._onRemoveSkillClicked(ev));
        html.find('.add-button').click((ev) => this._onAddSkillClicked(ev));
    }

    _onRemoveSkillClicked(eventData) {
        eventData.preventDefault();
        const skillContainer = $(eventData.currentTarget).parent();
        const skillId = skillContainer.attr('data-skill');

        skillContainer.remove();

        const skillItem = this.npc.findSkillItem(skillId);

        this.npc.deleteOwnedItem(skillItem._id);
    }

    async _onAddSkillClicked(eventData) {
        eventData.preventDefault();

        const localizedName = game.i18n.localize('PF2E.NewLoreSkill');

        const data: any = {
            name: `${localizedName}-lore`,
            type: 'lore',
            data: {
                mod: {
                    value: 0,
                },
                description: {
                    value: '',
                },
            },
        };

        await this.npc.createOwnedItem(data);

        this.render(true);
    }

    /**
     * Apply changes to the actor based on the data in the form.
     * @param event
     * @param formData
     */
    async _updateObject(event: Event, formData: any) {
        for (const [key, skillData] of Object.entries(formData as Record<any, any>)) {
            const isLoreSkill = key.includes('-lore');

            let skillId: string;
            let type: string;
            let value: number;
            let exception: string;

            if (isLoreSkill) {
                // Get skill id from the lore name, in case it has changed
                skillId = this.npc.convertSkillNameToSkillId(this.npc.convertItemNameToSkillName(skillData[0]));

                if (!skillId.includes('-lore')) {
                    skillId += '-lore';
                }

                type = key;
                value = parseInt(skillData[1], 10);
                exception = skillData[2] || '';
            } else {
                skillId = key;
                type = key;
                value = parseInt(skillData[0], 10);
                exception = skillData[1] || '';
            }

            const skillItem = this.npc.findSkillItem(skillId, exception);
            const skillItemValue: number = skillItem !== null ? (skillItem.data.data as any).mod.value : 0;
            const skillItemException: string = skillItem !== null ? skillItem.data.data.description.value : '';
            const hasToUpdateItem =
                skillItem !== null && ((skillItemValue !== value && value > 0) || skillItemException !== exception);
            const hasToCreateItem = skillItem === null && (value !== 0 || exception !== '');
            const hasToDelete = skillItem !== null && value === 0 && exception === '';
            const hasRenamedLoreSkill = isLoreSkill && type !== skillId;

            if (hasToUpdateItem) {
                skillItem.update({
                    [`data.mod.value`]: value,
                    [`data.description.value`]: exception,
                });
            } else if (hasToCreateItem) {
                const skillName = this.npc.convertSkillIdToSkillName(skillId);
                const itemName = this.npc.convertSkillNameToItemName(skillName);

                const data: any = {
                    name: itemName,
                    type: 'lore',
                    data: {
                        mod: {
                            value: value,
                        },
                        description: {
                            value: exception,
                        },
                    },
                };

                await this.npc.createOwnedItem(data);
            } else if (hasToDelete) {
                this.npc.deleteOwnedItem(skillItem._id);
            }

            // Delete old item from rename
            if (hasRenamedLoreSkill) {
                const itemToRemove = this.npc.findSkillItem(key);

                if (itemToRemove !== null) {
                    this.npc.deleteOwnedItem(itemToRemove._id);
                } else {
                    console.error(`Unable to remove old item skill for skill ${key}`);
                }
            }
        }
    }
}
