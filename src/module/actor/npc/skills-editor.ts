import type { NPCPF2e } from "@actor";
import { SKILL_EXPANDED } from "@actor/data/values";
import { NPCSkillData } from "@actor/npc/data";
import { LorePF2e } from "@item";
import { LoreSource } from "@item/data";
import { ErrorPF2e } from "@util";

/** Specialized form to setup skills for an NPC character. */
export class NPCSkillsEditor extends FormApplication<NPCPF2e> {
    get npc() {
        return this.object;
    }

    static override get defaultOptions() {
        const options = super.defaultOptions;

        options.id = "npc-skills-selector";
        options.classes = ["pf2e", "npc"];
        options.title = game.i18n.localize("PF2E.NPC.SkillsEditor.TitleLabel");
        options.template = "systems/pf2e/templates/actors/npc/forms/npc-skills-editor.html";
        options.width = "auto";
        options.height = 700;
        options.scrollY = [".skills-list"]; // ???

        return options;
    }

    /** Prepare data to be sent to HTML. */
    override getData() {
        const trainedSkills: Record<string, NPCSkillData> = {};
        const untrainedSkills: Record<string, NPCSkillData> = {};

        const skills = this.npc.data.data.skills;
        for (const [key, skill] of Object.entries(skills)) {
            if (this.isLoreSkill(key)) {
                skill.isLore = true;
                trainedSkills[key] = skill;
            } else if (skill.visible) {
                trainedSkills[key] = skill;
            } else {
                untrainedSkills[key] = skill;
            }
        }

        return { ...super.getData(), trainedSkills, untrainedSkills };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find(".delete").on("click", (event) => this.onClickRemoveSkill(event));
        $html.find(".add-lore-button").on("click", (event) => this.onClickAddLoreSkill(event));
        $html.find(".item-edit").on("click", (event) => this.onClickEditSkill(event));
        $html.find(".add-skill-button").on("click", (event) => this.onClickAddSkill(event));
    }

    private async onClickAddSkill(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const skillSelector = $(eventData.currentTarget).parents("#skill-selector").find("select");
        const skillId: string = skillSelector.val() as string;
        const skillName = this.findSkillName(skillId);
        const itemName = skillName.replace(/-/g, " ").titleCase();
        await this.npc.createEmbeddedDocuments("Item", [{ name: itemName, type: "lore" }]);

        this.render();
    }

    private async onClickRemoveSkill(event: JQuery.ClickEvent) {
        event.preventDefault();
        const skillContainer = $(event.currentTarget).parents(".skill");
        const skillId = skillContainer.attr("data-skill");

        const skillItem = this.findSkillItem(skillId ?? "");

        if (skillItem) {
            skillContainer.remove();
            await skillItem.delete();

            this.render(true);
        } else {
            console.error(`Unable to delete skill, couldn't find skill item.`);
        }
    }

    private async onClickAddLoreSkill(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();

        const loreNameField = $(event.currentTarget).parents("#lore-skill-creator").find("input");
        const loreName = String(loreNameField.val());

        const data: PreCreate<LoreSource> = {
            name: loreName,
            type: "lore",
            data: {
                mod: {
                    value: 0,
                },
            },
        };
        await this.npc.createEmbeddedDocuments("Item", [data]);

        this.render();
    }

    private onClickEditSkill(event: JQuery.ClickEvent): void {
        const skillId = $(event.currentTarget).parents(".skill").attr("data-skill");
        const item = this.findSkillItem(skillId ?? "");
        if (!item) throw ErrorPF2e(`Unable to find item for skill ${skillId}.`);

        item.sheet.render(true);
    }

    /**
     * Apply changes to the actor based on the data in the form.
     * @param event
     * @param formData
     */
    override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const updates = Object.entries(formData).flatMap(([key, modifier]) => {
            const value = Number(modifier) || 0;
            const skillItem = this.findSkillItem(key);
            if (!skillItem) return [];
            return { _id: skillItem.id, "data.mod.value": value };
        });
        await this.npc.updateEmbeddedDocuments("Item", updates);
    }

    private isLoreSkill(skillId: string): boolean {
        return !this.isRegularSkill(skillId);
    }

    /**
     * Checks if a skill is a regular skill or not.
     * @param skillId ID of the skill to check.
     */
    private isRegularSkill(skillId: string): boolean {
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
    private findSkillName(skillId: string): string {
        for (const skillDataId of Object.keys(SKILL_EXPANDED)) {
            const skillData = SKILL_EXPANDED[skillDataId];

            if (skillData.shortform === skillId) {
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
    private findSkillItem(skillId: string): Embedded<LorePF2e> | null {
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
