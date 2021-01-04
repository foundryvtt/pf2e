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
        options.title = game.i18n.localize('PF2E.NPCSkillsEditor.TitleLabel');
        options.template = 'systems/pf2e/templates/actors/npc/forms/npc-skills-editor.html';
        options.width = 'auto';
        options.height = 700;
        options.scrollY = ['.skills-list']; // ???

        return options;
    }
}