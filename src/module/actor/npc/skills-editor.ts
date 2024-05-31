import type { NPCPF2e } from "@actor";
import { NPCSkillData } from "@actor/npc/data.ts";
import { SKILL_ABBREVIATIONS } from "@actor/values.ts";
import { htmlQuery, htmlQueryAll, htmlClosest, sluggify } from "@util";

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
        const allSkills = Object.entries(this.actor.system.skills).map(([key, skill]) => ({
            ...skill,
            key: key,
            actor: this.actor.uuid,
        }));
        allSkills.sort((a, b) => a.label.localeCompare(b.label));

        const variants = allSkills.flatMap((skill) =>
            skill.variants.map((variant, key) => ({
                skill: skill.key,
                skillLabel: skill.label,
                label: variant.label,
                index: key,
                options: variant.options,
                mod: variant.value,
                predicate: variant.predicate,
            })),
        );

        return {
            ...(await super.getData(options)),
            actor: this.actor,
            skills: allSkills,
            variants: variants,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=number]")) {
            input.addEventListener("input", () => {
                const checkbox = input.closest("li")?.querySelector<HTMLInputElement>("input[type=checkbox]");
                if (checkbox) checkbox.checked = !!Number(input.value);
            });
        }

        const actorUuid = this.actor.uuid;
        let loresCreated = 0;
        async function createAdditionalLore() {
            const loresList = html.querySelector(".lores-list");
            if (loresList) {
                const slug = `new-lore-${loresCreated}`;
                const content = await renderTemplate("/systems/pf2e/templates/actors/npc/partials/lore.hbs", {
                    actor: actorUuid,
                    slug: slug,
                    label: "",
                    base: 0,
                    visible: true,
                });

                loresList?.insertAdjacentHTML("beforeend", content);

                const newCheckbox = loresList?.querySelector<HTMLInputElement>(`input[name="lore.${slug}.enabled"]`);

                const labelInput = htmlQuery<HTMLInputElement>(loresList, `input[name="lore.${slug}.label"]`);
                if (labelInput) {
                    labelInput.focus();
                    labelInput.select();
                }

                const modInput = htmlQuery<HTMLInputElement>(loresList, `input[name="lore.${slug}.mod"]`);
                if (modInput && newCheckbox) {
                    modInput.addEventListener("input", () => {
                        newCheckbox.checked = !!Number(modInput.value);
                        newCheckbox.dispatchEvent(new Event("input"));
                    });
                }

                loresCreated += 1;
            }
        }

        htmlQuery(html, "a[data-action=add-lore]")?.addEventListener("click", async (event) => {
            createAdditionalLore();
        });

        for (const removeVariant of htmlQueryAll<HTMLAnchorElement>(html, `a[data-action="remove-variant"]`)) {
            removeVariant.addEventListener("click", () => {
                const element = removeVariant.closest("li.variant");
                if (element) {
                    element.remove();
                }
            });
        }

    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const expanded = fu.expandObject(formData) as unknown as EditorFormData;

        const skills: Record<string, { value: number } | null> = {};
        for (const [skill, value] of Object.entries(expanded.skill)) {
            const selected = !!value.enabled;
            const mod = Math.trunc(Math.abs(value.mod ?? 0));
            if (selected && mod) {
                skills[skill] = {
                    value: mod,
                };
            } else {
                skills[`-=${skill}`] = null;
            }
        }

        const lores: Record<string, { name: string; value: number } | null> = {};
        for (const [lore, value] of Object.entries(expanded.lore)) {
            const selected = !!value.enabled;
            const mod = Math.trunc(Math.abs(value.mod ?? 0));
            const label = value.label;
            if (selected && mod) {
                lores[lore] = {
                    name: label,
                    value: mod,
                };
            }
        }

        return super._updateObject(event, {
            "system.skills": skills,
            "system.lores": Object.values(lores),
        });
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
    skills: NPCSkillData[];
    variants: any;
}

interface EditorFormData {
    skill: Record<string, { enabled: boolean; mod: number | null }>;
    lore: Record<string, { enabled: boolean; mod: number | null; label: string }>;
}
