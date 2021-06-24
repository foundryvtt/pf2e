import { SKILL_EXPANDED } from '@actor/data/values';
import { NPCSkillData } from '@actor/npc/data';
import type { NPCPF2e } from '@actor/index';
import type { ItemPF2e, LorePF2e } from '@item/index';
import { ErrorPF2e } from '@module/utils';

/**
 * Specialized form to setup skills for an NPC character.
 */
export class NPCSkillsEditor extends FormApplication<NPCPF2e> {
    newItems: ItemPF2e[] = [];

    constructor(actor: NPCPF2e, options: FormApplicationOptions) {
        super(actor, options);
    }

    get npc() {
        return this.object;
    }

    static override get defaultOptions() {
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

    /** Prepare data to be sent to HTML. */
    override getData() {
        const skills: Record<string, NPCSkillData> = {};
        const missingSkills: Record<string, NPCSkillData> = {};

        for (const skillId of Object.keys(this.npc.data.data.skills)) {
            const skill = this.object.data.data.skills[skillId];

            if (this.isLoreSkill(skillId)) {
                skill.isLore = true;
                skills[skillId] = skill;
            } else if (skill.visible) {
                skill.label = game.i18n.localize('PF2E.Skill' + skill.name);
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
    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        html.find('.delete').on('click', (event) => this.onRemoveSkillClicked(event));
        html.find('.add-lore-button').on('click', (event) => this.onAddLoreSkillClicked(event));
        html.find('.item-edit').on('click', (event) => this.onEditSkillClicked(event));
        html.find('.add-skill-button').on('click', (event) => this.onAddSkillClicked(event));
    }

    private async onAddSkillClicked(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const skillSelector = $(eventData.currentTarget).parents('#skill-selector').find('select');
        const skillId: string = skillSelector.val() as string;
        const skillName = this.findSkillName(skillId);
        const itemName = skillName.replace(/-/g, ' ').titleCase();
        await this.npc.createEmbeddedDocuments('Item', [{ name: itemName, type: 'lore' }]);

        this.render(true);
    }

    private async onRemoveSkillClicked(event: JQuery.ClickEvent) {
        event.preventDefault();
        const skillContainer = $(event.currentTarget).parents('.skill');
        const skillId = skillContainer.attr('data-skill');

        const skillItem = this.findSkillItem(skillId ?? '');

        if (skillItem) {
            skillContainer.remove();
            await skillItem.delete();

            this.render(true);
        } else {
            console.error(`Unable to delete skill, couldn't find skill item.`);
        }
    }

    private async onAddLoreSkillClicked(event: JQuery.ClickEvent) {
        event.preventDefault();

        const loreNameField = $(event.currentTarget).parents('#lore-skill-creator').find('input');
        const loreName = String(loreNameField.val());

        const data = {
            name: loreName,
            type: 'lore',
            label: loreName,
            data: {
                mod: {
                    value: 0,
                },
            },
        };

        await this.npc.createEmbeddedDocuments('Item', [data]);

        this.render(true);
    }

    private onEditSkillClicked(event: JQuery.ClickEvent) {
        const skillId = $(event.currentTarget).parents('.skill').attr('data-skill');

        const item = this.findSkillItem(skillId ?? '');

        if (!item) {
            throw ErrorPF2e(`Unable to find item for skill ${skillId}. Can't edit the skill.`);
        }

        item.sheet.render(true);
    }

    /**
     * Apply changes to the actor based on the data in the form.
     * @param event
     * @param formData
     */
    override async _updateObject(_event: Event, formData: any): Promise<void> {
        for (const [key, skillData] of Object.entries(formData as Record<any, any>)) {
            const skillId = key;
            const value = parseInt(skillData, 10);

            const skillItem = this.findSkillItem(skillId);
            if (!skillItem) return;

            const skillItemValue: number = skillItem.data.data.mod.value;
            const hasToUpdateItem = skillItemValue !== value && value > 0;
            if (hasToUpdateItem) {
                await skillItem.update({
                    [`data.mod.value`]: value,
                });
            }
        }
    }

    isLoreSkill(skillId: string): boolean {
        return !this.isRegularSkill(skillId);
    }

    /**
     * Checks if a skill is a regular skill or not.
     * @param skillId ID of the skill to check.
     */
    isRegularSkill(skillId: string): boolean {
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
    findSkillItem(skillId: string): Embedded<LorePF2e> | null {
        const skill = this.npc.data.data.skills[skillId];

        if (skill === undefined) {
            console.error(`No skill found with skill id ${skillId}`);
            return null;
        }

        if (skill.itemID === undefined) {
            console.error(`Skill has no itemID defined.`);
            return null;
        }

        return this.npc.itemTypes.lore.find((item) => item.id === skill.itemID) ?? null;
    }
}
