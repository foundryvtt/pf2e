import { PF2ECONFIG } from "../../scripts/config";

/**
 * Specialized form to setup skills for an NPC character.
 */
export class NPCSkillsEditor extends FormApplication {

    constructor(actor, options) {
        super(actor, options);

        // Process actor and options
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        options.id = "npc-skills-selector";
        options.classes = ['pf2e'];
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
            skills: this.object.data.data.skills
        };
    }

    /**
     * Subscribe to events from HTML.
     * @param html 
     */
    activateListeners(html) {
        super.activateListeners(html);

        html.find('.delete').click((ev) => this._onRemoveSkillClicked(ev));
    }

    _onRemoveSkillClicked(eventData) {
        eventData.preventDefault();
        const skillContainer = $(eventData.currentTarget).parent();
        const skillId = skillContainer.attr('data-skill');

        skillContainer.remove();
    }

    /**
     * Apply changes to the actor based on the data in the form.
     * @param event 
     * @param formData 
     */
    async _updateObject(event: Event, formData: any) {
        const result = {};
        const loreSkillIds = [];

        console.log("Form:");
        console.log(formData);

        for (const [skillId, skillData] of Object.entries(formData as Record<any, any>)) {
            const isLoreSkill = skillId.includes('-lore');

            if (isLoreSkill) {
                const loreSkillId = skillData[0].toLowerCase().replace(/\s/g,'_') + "-lore";
                result[loreSkillId] = {
                    type: loreSkillId,
                    loreName: skillData[0],
                    value: parseInt(skillData[1], 10),
                    exception: skillData[2] || '',
                };

                loreSkillIds.push(loreSkillId);

            } else {
                result[skillId] = {
                    type: skillId,
                    value: parseInt(skillData[0], 10),
                    exception: skillData[1] || '',
                };
            }
        }

        console.log("Result:");
        console.log(result);
        
        await this.object.update({ [`data.skills`]: result});

        console.log("Skills:");
        console.log(this.object.data.data.skills);

        // TODO: Remove lore skills no found in the form
    }
}