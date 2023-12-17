import type { NPCPF2e } from "@actor";
import { NPCSkillData } from "@actor/npc/data.ts";
import { SKILL_LONG_FORMS } from "@actor/values.ts";
import { LoreSource } from "@item/base/data/index.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, setHasElement } from "@util";

/** Specialized form to setup skills for an NPC character. */
export class NPCSkillsEditor extends DocumentSheet<NPCPF2e> {
    get actor(): NPCPF2e {
        return this.object;
    }

    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            classes: ["pf2e", "npc-skills-editor"],
            template: "systems/pf2e/templates/actors/npc/skills-editor.hbs",
            height: "auto",
            scrollY: [".scroll-container"],
            sheetConfig: false,
            submitOnChange: false,
            submitOnClose: false,
            width: "400",
        };
    }

    override get title(): string {
        return game.i18n.format("PF2E.Actor.NPC.SkillsEditor.Title", { actor: this.actor.name });
    }

    /** Prepare data to be sent to HTML. */
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<EditorData> {
        const allSkills = Object.values(this.actor.system.skills);

        return {
            ...(await super.getData(options)),
            actor: this.actor,
            trainedSkills: allSkills.filter((s) => s.visible).sort((a, b) => a.label.localeCompare(b.label)),
            untrainedSkills: allSkills.filter((s) => !s.visible).sort((a, b) => a.label.localeCompare(b.label)),
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "button[data-action=add-skill]")?.addEventListener("click", async (event) => {
            const slug = htmlQuery(htmlClosest(event.currentTarget, ".skill-selector"), "select")?.value;
            if (setHasElement(SKILL_LONG_FORMS, slug)) {
                await this.actor.createEmbeddedDocuments("Item", [{ name: slug.titleCase(), type: "lore" }]);
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

        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[data-modifier]")) {
            input.addEventListener("change", async () => {
                const modifier = Math.clamped(Math.trunc(Number(input.value) || 0), -999, 999);
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

        for (const anchor of htmlQueryAll(html, "a[data-action=edit-skill]")) {
            anchor.addEventListener("click", () => {
                const itemId = htmlClosest(anchor, "[data-item-id]")?.dataset.itemId;
                const item = this.actor.items.get(itemId, { strict: true });
                item.sheet.render(true);
            });
        }

        for (const anchor of htmlQueryAll(html, "a[data-action=remove-skill]")) {
            anchor.addEventListener("click", async () => {
                const itemId = htmlClosest(anchor, "[data-item-id]")?.dataset.itemId;
                const item = this.actor.items.get(itemId, { strict: true });
                await item.delete();
            });
        }
    }

    /** Crude maintaining of focus to work around Tagify on NPC sheet stealing it */
    protected override async _render(force?: boolean, options?: RenderOptions): Promise<void> {
        const focusedElement = htmlQuery<HTMLInputElement | HTMLSelectElement>(this.form, "input:focus, select:focus");
        await super._render(force, options);

        if (focusedElement) {
            const selector = ["input", "select"].map((s) => `${s}#${CSS.escape(focusedElement.id)}`).join(",");
            const newInput = htmlQuery<HTMLInputElement | HTMLSelectElement>(this.form, selector);
            window.setTimeout(() => {
                newInput?.focus();
            }, 0);
        }
    }
}

interface EditorData extends DocumentSheetData<NPCPF2e> {
    actor: NPCPF2e;
    trainedSkills: NPCSkillData[];
    untrainedSkills: NPCSkillData[];
}
