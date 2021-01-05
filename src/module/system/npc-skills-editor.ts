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
    }

    /**
     * Apply changes to the actor based on the data in the form.
     * @param event 
     * @param formData 
     */
    async _updateObject(event: Event, formData: any) {
        const result = {};
        
        for (const [skillId, skillData] of Object.entries(formData as Record<any, any>)) {
            result[skillId] = {
                type: skillId,
                value: parseInt(skillData[0], 10),
                exception: skillData[1] || '',
            };
        }
        
        await this.object.update({ [`data.skills`]: result});
    }
}