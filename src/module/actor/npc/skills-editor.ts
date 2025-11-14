import type { NPCPF2e } from "@actor";
import { NPCSkillData, NPCSource } from "@actor/npc/data.ts";
import { LoreSource } from "@item/base/data/index.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, objectHasKey } from "@util";
import appv1 = foundry.appv1;

/** Specialized form to setup skills for an NPC character. */
export class NPCSkillsEditor extends appv1.api.DocumentSheet<NPCPF2e> {
    get actor(): NPCPF2e {
        return this.object;
    }

    static override get defaultOptions(): appv1.api.DocumentSheetV1Options {
        return {
            ...super.defaultOptions,
            classes: ["pf2e", "npc-skills-editor"],
            template: `${SYSTEM_ROOT}/templates/actors/npc/skills-editor.hbs`,
            height: "auto",
            scrollY: [".scroll-container"],
            sheetConfig: false,
            submitOnChange: true,
            submitOnClose: false,
            closeOnSubmit: false,
            resizable: true,
            width: 500,
        };
    }

    override get title(): string {
        return game.i18n.format("PF2E.Actor.NPC.SkillsEditor.Title", { actor: this.actor.name });
    }

    /** Prepare data to be sent to HTML. */
    override async getData(options?: Partial<appv1.api.DocumentSheetV1Options>): Promise<EditorData> {
        const allSkills = Object.values(this.actor.system.skills);

        return {
            ...(await super.getData(options)),
            actor: this.actor,
            trainedSkills: allSkills.filter((s) => s.visible && !s.lore).sort((a, b) => a.label.localeCompare(b.label)),
            loreSkills: allSkills.filter((s) => s.visible && s.lore).sort((a, b) => a.label.localeCompare(b.label)),
            untrainedSkills: allSkills.filter((s) => !s.visible).sort((a, b) => a.label.localeCompare(b.label)),
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "button[data-action=add-skill]")?.addEventListener("click", async (event) => {
            const slug = htmlQuery(htmlClosest(event.currentTarget, ".skill-selector"), "select")?.value;
            if (slug && slug in CONFIG.PF2E.skills) {
                await this.actor.update({ [`system.skills.${slug}`]: { base: 0 } });
            }
        });

        htmlQuery(html, "button[data-action=add-lore]")?.addEventListener("click", async (event) => {
            const loreName = htmlQuery(htmlClosest(event.currentTarget, ".lore-skill-creator"), "input")?.value.trim();
            if (loreName) {
                const data: PreCreate<LoreSource> = {
                    name: loreName,
                    type: "lore",
                    system: { mod: { value: 0 } },
                };
                await this.actor.createEmbeddedDocuments("Item", [data]);
            }
        });

        for (const button of htmlQueryAll(html, "a[data-action=add-special-skill]")) {
            button.addEventListener("click", (event): void => {
                const skill = htmlClosest(event.target, "[data-skill]")?.dataset.skill;
                if (!objectHasKey(CONFIG.PF2E.skills, skill)) return;

                const special = fu.deepClone(this.actor._source.system.skills[skill]?.special ?? []);
                special.push({ label: "", base: 0 });
                this.actor.update({ [`system.skills.${skill}.special`]: special });
            });
        }

        for (const button of htmlQueryAll(html, "a[data-action=remove-special-skill]")) {
            button.addEventListener("click", (event): void => {
                const skill = htmlClosest(event.target, "[data-skill]")?.dataset.skill;
                if (!objectHasKey(CONFIG.PF2E.skills, skill) || !(event.currentTarget instanceof HTMLElement)) return;

                const index = Number(event.currentTarget.dataset.specialSkillIndex);
                const special =
                    this.actor._source.system.skills[skill]?.special?.filter((_, idx) => index !== idx) ?? [];
                if (special.length === 0) {
                    this.actor.update({ [`system.skills.${skill}.-=special`]: null });
                } else {
                    this.actor.update({ [`system.skills.${skill}.special`]: special });
                }
            });
        }

        // Update for lore skills only
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[data-modifier]")) {
            input.addEventListener("change", async () => {
                const modifier = Math.clamp(Math.trunc(Number(input.value) || 0), -999, 999);
                if (Number.isInteger(modifier)) {
                    const itemId = htmlClosest(input, "[data-item-id]")?.dataset.itemId;
                    const item = this.actor.items.get(itemId, { strict: true });
                    await item.update({ "system.mod.value": modifier });
                }
            });

            input.addEventListener("focus", () => {
                input.select();
            });
        }

        // Used to edit lore skills
        for (const anchor of htmlQueryAll(html, "a[data-action=edit-skill]")) {
            anchor.addEventListener("click", () => {
                const itemId = htmlClosest(anchor, "[data-item-id]")?.dataset.itemId;
                const item = this.actor.items.get(itemId, { strict: true });
                item.sheet.render(true);
            });
        }

        // Used to delete a skill or lore
        for (const anchor of htmlQueryAll(html, "a[data-action=remove-skill]")) {
            anchor.addEventListener("click", () => {
                const skill = htmlClosest(anchor, "[data-skill]")?.dataset.skill;
                const itemId = htmlClosest(anchor, "[data-item-id]")?.dataset.itemId;
                if (skill) {
                    this.actor.update({ [`system.skills.-=${skill}`]: null });
                } else if (itemId) {
                    const item = this.actor.items.get(itemId, { strict: true });
                    item.delete();
                }
            });
        }
    }

    /** Prevent submissions when a non-form element (such as lore name) changes */
    protected override async _onChangeInput(event: Event): Promise<void> {
        if (event.target instanceof HTMLElement && event.target.hasAttribute("name")) {
            return super._onChangeInput(event);
        }
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const data: Partial<NPCSource> = fu.expandObject(formData);

        // Convert special skill modifiers
        try {
            for (const skill of Object.values(data.system?.skills ?? {})) {
                skill.special = Object.values(skill.special ?? {});
                for (const special of skill.special) {
                    special.predicate =
                        special.predicate && typeof special.predicate === "string" ? JSON.parse(special.predicate) : [];
                    if (special.predicate?.length === 0) {
                        delete special.predicate;
                    } else if (!Array.isArray(special.predicate)) {
                        throw Error(game.i18n.localize("PF2E.Actor.NPC.SkillsEditor.Error.PredicateArray"));
                    }
                }
            }
        } catch (ex) {
            if (ex instanceof Error) {
                ui.notifications.error(ex.message);
            }
            throw ex;
        }

        return super._updateObject(event, fu.flattenObject(data));
    }

    /** Maintain focus since upstream only operates on named elements */
    protected override async _render(force?: boolean, options?: appv1.api.AppV1RenderOptions): Promise<void> {
        const focusedElement = htmlQuery<HTMLInputElement | HTMLSelectElement>(this.form, "input:focus, select:focus");
        await super._render(force, options);

        if (focusedElement?.id) {
            const newInput = document.getElementById(focusedElement.id);
            if (newInput instanceof HTMLInputElement || newInput instanceof HTMLSelectElement) {
                window.setTimeout(() => {
                    newInput.focus();
                }, 0);
            }
        }
    }
}

interface EditorData extends appv1.api.DocumentSheetData<NPCPF2e> {
    actor: NPCPF2e;
    trainedSkills: NPCSkillData[];
    loreSkills: NPCSkillData[];
    untrainedSkills: NPCSkillData[];
}
