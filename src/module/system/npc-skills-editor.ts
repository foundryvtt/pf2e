import { PF2ECONFIG } from "../../scripts/config";
import { PF2ENPC } from "../actor/npc";
import { PF2EItem } from "../item/item";

/**
 * Specialized form to setup skills for an NPC character.
 */
export class NPCSkillsEditor extends FormApplication {

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
        for (const [skillId, skillData] of Object.entries(formData as Record<any, any>)) {
            const isLoreSkill = skillId.includes('-lore');

            let type: string;
            let value: number;
            let exception: string;

            if (isLoreSkill) {
                type = skillData[0].toLowerCase().replace(/\s/g,'_') + "-lore";
                value = parseInt(skillData[1], 10);
                exception = skillData[2] || '';
            } else {
                type = skillId;
                value = parseInt(skillData[0], 10);
                exception = skillData[1] || '';
            }

            const skillItem = this.npc.findSkillItem(skillId, exception);
            const skillItemValue: number = skillItem !== null ? (skillItem.data.data as any).mod.value : 0;
            const skillItemException: string = skillItem !== null ? skillItem.data.data.description.value : '';
            const hasToUpdateItem = (skillItem !== null && (skillItemValue !== value && value > 0 || skillItemException !== exception));
            const hasToCreateItem = (skillItem === null && (value !== 0 || exception !== ''));
            const hasToDelete = (skillItem !== null && value === 0 && exception === '');

            if (hasToUpdateItem) {
                console.log(`Updating item ${skillItem.name} for skill ${skillId} from value ${skillItemValue} to ${value} and exception from ${skillItemException} to ${exception}`);
                console.log(`Pre-update state:`);
                console.log(skillItem);
                
                skillItem.update({
                    [`data.mod.value`]: value,
                    [`data.description.value`]: exception
                });

                console.log(`Post-update state:`);
                console.log(skillItem);
            } else if (hasToCreateItem) {
                console.log(`Creating item for skill ${skillId} with value ${value} and exception ${exception}`);
            } else if (hasToDelete) {
                console.log(`Deleting item ${skillItem.name} for skill ${skillId} with value ${value} and exception ${exception}`);
            }

            // TODO: If no item skill, add a new one for this skill

            // TODO: If one found, update its value

            // TODO: Remove skill items for skills with value 0 and no exception

            // TODO: Remove skill items for lore skills removed in the popup
        }
    }
}