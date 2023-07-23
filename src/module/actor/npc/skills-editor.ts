import type { NPCPF2e } from "@actor";
import { NPCSkillData } from "@actor/npc/data.ts";
import { SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/values.ts";
import { LorePF2e } from "@item";
import { LoreSource } from "@item/data/index.ts";
import { ErrorPF2e, objectHasKey } from "@util";

/** Specialized form to setup skills for an NPC character. */
export class NPCSkillsEditor extends FormApplication<NPCPF2e> {
    get npc(): NPCPF2e {
        return this.object;
    }

    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;

        options.id = "npc-skills-selector";
        options.classes = ["pf2e", "npc"];
        options.title = game.i18n.localize("PF2E.NPC.SkillsEditor.TitleLabel");
        options.template = "systems/pf2e/templates/actors/npc/forms/npc-skills-editor.hbs";
        options.width = "auto";
        options.height = 700;
        options.scrollY = [".skills-list"]; // ???

        return options;
    }

    /** Prepare data to be sent to HTML. */
    override async getData(): Promise<EditorData> {
        const trainedSkills: Record<string, NPCSkillData> = {};
        const untrainedSkills: Record<string, NPCSkillData> = {};

        const { skills } = this.npc.system;
        for (const [key, skill] of Object.entries(skills)) {
            if (this.#isLoreSkill(key)) {
                skill.isLore = true;
                trainedSkills[key] = skill;
            } else if (skill.visible) {
                trainedSkills[key] = skill;
            } else {
                untrainedSkills[key] = skill;
            }
        }

        return { ...(await super.getData()), trainedSkills, untrainedSkills };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find(".delete").on("click", (event) => this.#onClickRemoveSkill(event));
        $html.find(".add-lore-button").on("click", (event) => this.#onClickAddLoreSkill(event));
        $html.find(".item-edit").on("click", (event) => this.#onClickEditSkill(event));
        $html.find(".add-skill-button").on("click", (event) => this.#onClickAddSkill(event));
    }

    async #onClickAddSkill(eventData: JQuery.ClickEvent) {
        eventData.preventDefault();

        const skillSelector = $(eventData.currentTarget).parents("#skill-selector").find("select");
        const skillId: string = skillSelector.val() as string;
        const skillName = this.#findSkillName(skillId);
        const itemName = skillName.replace(/-/g, " ").titleCase();
        await this.npc.createEmbeddedDocuments("Item", [{ name: itemName, type: "lore" }]);

        this.render();
    }

    async #onClickRemoveSkill(event: JQuery.ClickEvent) {
        event.preventDefault();
        const skillContainer = $(event.currentTarget).parents(".skill");
        const skillId = skillContainer.attr("data-skill");

        const skillItem = this.#findSkillItem(skillId ?? "");

        if (skillItem) {
            skillContainer.remove();
            await skillItem.delete();

            this.render(true);
        } else {
            console.error(`Unable to delete skill, couldn't find skill item.`);
        }
    }

    async #onClickAddLoreSkill(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();

        const loreNameField = $(event.currentTarget).parents("#lore-skill-creator").find("input");
        const loreName = String(loreNameField.val());

        const data: PreCreate<LoreSource> = {
            name: loreName,
            type: "lore",
            system: { mod: { value: 0 } },
        };
        await this.npc.createEmbeddedDocuments("Item", [data]);

        this.render();
    }

    #onClickEditSkill(event: JQuery.ClickEvent): void {
        const skillId = $(event.currentTarget).parents(".skill").attr("data-skill");
        const item = this.#findSkillItem(skillId ?? "");
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
            const skillItem = this.#findSkillItem(key);
            if (!skillItem) return [];
            return { _id: skillItem.id, "system.mod.value": value };
        });
        await this.npc.updateEmbeddedDocuments("Item", updates);
    }

    #isLoreSkill(skillId: string): boolean {
        return !this.#isRegularSkill(skillId);
    }

    /**
     * Checks if a skill is a regular skill or not.
     * @param skillId ID of the skill to check.
     */
    #isRegularSkill(skillId: string): boolean {
        for (const longForm of SKILL_LONG_FORMS) {
            if (longForm === skillId) return true;
            if (SKILL_EXPANDED[longForm].shortForm === skillId) return true;
        }

        return false;
    }

    /**
     * Converts from the 3-letter ID to the full, lower-letter name.
     * @param skillId ID of the skill.
     */
    #findSkillName(skillId: string): string {
        for (const longForm of SKILL_LONG_FORMS) {
            const skillData = SKILL_EXPANDED[longForm];

            if (skillData.shortForm === skillId) {
                return longForm;
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
    #findSkillItem(skillId: string): LorePF2e<NPCPF2e> | null {
        const { skills } = this.npc.system;
        const skillData = objectHasKey(skills, skillId) ? skills[skillId] : null;

        if (!skillData) {
            console.error(`No skill found with skill id ${skillId}`);
            return null;
        }

        const loreItem = this.npc.items.get(skillData.itemID ?? "");
        if (!loreItem?.isOfType("lore")) {
            console.error("Lore item not found");
            return null;
        }

        return loreItem;
    }
}

interface EditorData extends FormApplicationData {
    trainedSkills: Record<string, NPCSkillData>;
    untrainedSkills: Record<string, NPCSkillData>;
}
