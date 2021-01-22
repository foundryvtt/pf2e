import { SKILL_EXPANDED } from '../actor/actor';
import { NPCSkillData } from '../actor/actorDataDefinitions';
import { PF2ENPC } from '../actor/npc';
import { PF2EItem } from '../item/item';

/**
 * Specialized form to setup skills for an NPC character.
 */
export class NPCSkillsEditor extends FormApplication<PF2ENPC> {
    npc: PF2ENPC;
    newItems: PF2EItem[];

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
        const skills: Record<string, NPCSkillData> = {};
        const missingSkills: Record<string, NPCSkillData> = {};

        for (const skillId of Object.keys(this.object.data.data.skills)) {
            const skill = this.object.data.data.skills[skillId];

            if (skill.visible === false) {
                if (this.isRegularSkill(skill)) {
                    missingSkills[skillId] = skill;
                }

                continue;
            }

            if (this.isLoreSkill(skill)) {
                // Additional processing for lore skills
                // Flags as lore to show it in the lore section
                skill.isLore = true;

                // Extract the lore name to show only the name in the name field
                const regExpFormat = game.i18n.format('PF2E.LoreSkillFormat', { name: '(.*)' });
                const result = skill.label.match(regExpFormat);

                skill.loreName = result?.length >= 2 ? result[1] : '???';

                skills[skillId] = skill;
            } else if (this.isRegularSkill(skill)) {
                skills[skillId] = skill;
            }
        }

        return {
            ...super.getData(),
            skills: skills,
            missingSkills: missingSkills,
        };
    }

    /**
     * Subscribe to events from HTML.
     * @param html
     */
    activateListeners(html) {
        super.activateListeners(html);

        html.find('.delete').click((ev) => this._onRemoveSkillClicked(ev));
        html.find('.add-lore-button').click((ev) => this._onAddLoreSkillClicked(ev));
        html.find('.item-edit').click((ev) => this._onEditSkillClicked(ev));
        html.find('.add-skill-button').click((ev) => this._onAddSkillClicked(ev));
    }

    async _onAddSkillClicked(eventData: Event) {
        eventData.preventDefault();

        const skillSelector = $(eventData.currentTarget).parents('#skill-selector').find('select');
        const skillId: string = skillSelector.val() as string;
        const skillName = this.npc.convertSkillIdToSkillName(skillId);
        const itemName = this.npc.convertSkillNameToItemName(skillName);

        await this.npc.createOwnedItem({
            name: itemName,
            type: 'lore',
        });

        this.render(true);
    }

    async _onRemoveSkillClicked(eventData) {
        eventData.preventDefault();
        const skillContainer = $(eventData.currentTarget).parents('.skill');
        const skillId = skillContainer.attr('data-skill');

        const skillItem = this.npc.findSkillItem(skillId);

        if (skillItem !== null) {
            skillContainer.remove();
            await this.npc.deleteOwnedItem(skillItem._id);

            this.render(true);
        } else {
            console.error(`Unable to delete skill, couldn't find skill item.`);
        }
    }

    async _onAddLoreSkillClicked(eventData) {
        eventData.preventDefault();

        const localizedName = game.i18n.localize('PF2E.NewLoreSkill');

        const data: any = {
            name: `${localizedName}-lore`,
            type: 'lore',
            label: game.i18n.format('PF2E.LoreSkillFormat', { name: localizedName }),
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

    _onEditSkillClicked(eventData) {
        const skillId = $(eventData.currentTarget).parents('.skill').attr('data-skill');

        let item = this.npc.findSkillItem(skillId);

        if (item === null) {
            console.error(`Unable to find item for skill ${skillId}. Can't edit the skill.`);
            return;
        }

        item.sheet.render(true);
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

            if (isLoreSkill) {
                // Get skill id from the lore name, in case it has changed
                skillId = this.npc.convertSkillNameToSkillId(this.npc.convertItemNameToSkillName(skillData[0]));

                if (!skillId.includes('-lore')) {
                    skillId += '-lore';
                }

                type = key;
                value = parseInt(skillData[1], 10);
            } else {
                skillId = key;
                type = key;
                value = parseInt(skillData, 10);
            }

            const skillItem = this.npc.findSkillItem(skillId);
            const skillItemValue: number = skillItem !== null ? (skillItem.data.data as any).mod.value : 0;
            const hasToUpdateItem = skillItem !== null && skillItemValue !== value && value > 0;
            const hasToCreateItem = skillItem === null && value !== 0;
            const hasToDelete = skillItem !== null && value === 0;
            const hasRenamedLoreSkill = isLoreSkill && type !== skillId;

            if (hasToUpdateItem) {
                await skillItem.update({
                    [`data.mod.value`]: value,
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

    isLoreSkill(skill) {
        return !this.isRegularSkill(skill);
    }

    isRegularSkill(skill) {
        for (const skillName of Object.keys(SKILL_EXPANDED)) {
            if (skillName === skill.name) return true;
            if (skillName === skill.expanded) return true;   
        }

        return false;
    }
}
