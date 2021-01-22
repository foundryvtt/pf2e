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

        for (const skillId of Object.keys(this.npc.data.data.skills)) {
            const skill = this.object.data.data.skills[skillId];

            if (this.isLoreSkill(skillId)) {
                skill.isLore = true;
                skills[skillId] = skill;
            } else if (skill.visible) {
                skills[skillId] = skill;
            } else {
                missingSkills[skillId] = skill;
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
        const skillName = this.findSkillName(skillId);
        const itemName = skillName.replace(/-/g, ' ').titleCase();

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

        const skillItem = this.findSkillItem(skillId);

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

        const loreNameField = $(eventData.currentTarget).parents('#lore-skill-creator').find('input');
        const loreName = loreNameField.val() as string;

        const data: any = {
            name: loreName,
            type: 'lore',
            label: loreName,
            data: {
                mod: {
                    value: 0,
                },
            },
        };

        await this.npc.createOwnedItem(data);

        this.render(true);
    }

    _onEditSkillClicked(eventData) {
        const skillId = $(eventData.currentTarget).parents('.skill').attr('data-skill');

        let item = this.findSkillItem(skillId);

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
            let skillId: string;
            let value: number;

            skillId = key;
            value = parseInt(skillData, 10);

            const skillItem = this.findSkillItem(skillId);
            const skillItemValue: number = skillItem !== null ? (skillItem.data.data as any).mod.value : 0;
            const hasToUpdateItem = skillItem !== null && skillItemValue !== value && value > 0;

            if (hasToUpdateItem) {
                await skillItem.update({
                    [`data.mod.value`]: value,
                });
            }
        }
    }

    isLoreSkill(skillId) {
        return !this.isRegularSkill(skillId);
    }

    /**
     * Checks if a skill is a regular skill or not.
     * @param skillId ID of the skill to check.
     */
    isRegularSkill(skillId) {
        for (const key of Object.keys(SKILL_EXPANDED)) {
            if (key === skillId) return true;
            if (SKILL_EXPANDED[key].shortform === skillId) return true;
        }

        return false;
    }

    /**
     * Converts from the 3-letter ID to the full, lower-letter name.
     * @param skillId ID of the skill.
     */
    findSkillName(skillId: string): string {
        for (const skillDataId of Object.keys(SKILL_EXPANDED)) {
            const skillData = SKILL_EXPANDED[skillDataId];

            if (skillData.shortform == skillId) {
                return skillDataId;
            }
        }

        // If not possible to find a short name, use the same
        return skillId;
    }

    /**
     * Finds the skill item related to the skill provided.
     * Each skill in the characters has an item in the items collection
     * defining the skill. They are of 'lore' type, even for non-lore skills.
     * @param skillId ID of the skill to search for.
     */
    findSkillItem(skillId: string): PF2EItem {
        const skill = this.npc.data.data.skills[skillId];

        if (skill === undefined) {
            console.error(`No skill found with skill id ${skillId}`);
            return null;
        }

        if (skill.itemID === undefined) {
            console.error(`Skill has no itemID defined.`);
            return null;
        }

        return this.npc.getOwnedItem(skill.itemID);
    }
}
