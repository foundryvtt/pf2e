import type { NPCPF2e } from "@actor";
import type { NPCSpecialSkillSource } from "@actor/npc/data.ts";
import type { LoreSource } from "@item/base/data/index.ts";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import Root from "./app.svelte";

interface NPCSkillsEditorConfiguration extends fa.ApplicationConfiguration {
    actor: NPCPF2e;
}

class NPCSkillsEditor extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<NPCSkillsEditorConfiguration> }
>(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<NPCSkillsEditorConfiguration> = {
        classes: ["npc-skills-editor"],
        position: { width: 520, height: "auto" },
        window: { contentClasses: ["standard-form"], resizable: true },
    };

    declare options: NPCSkillsEditorConfiguration;

    protected root = Root;

    /** Pending special-modifier writes: see `#enqueueSpecialWrite` */
    #specialWrites: Promise<unknown> = Promise.resolve();

    get #actor(): NPCPF2e {
        return this.options.actor;
    }

    override get title(): string {
        return _loc("PF2E.Actor.NPC.SkillsEditor.Title", { actor: this.#actor.name });
    }

    protected override _initializeApplicationOptions(
        options: Partial<NPCSkillsEditorConfiguration>,
    ): NPCSkillsEditorConfiguration {
        const initialized = super._initializeApplicationOptions(options) as NPCSkillsEditorConfiguration;
        initialized.uniqueId = `npc-skills-editor-${initialized.actor.uuid}`;
        return initialized;
    }

    protected override async _onFirstRender(
        context: NPCSkillsEditorContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.#actor.apps[this.id] = this;
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        delete this.#actor.apps[this.id];
        super._tearDown(options);
    }

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<NPCSkillsEditorContext> {
        const allSkills = Object.values(this.#actor.system.skills);
        const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);

        const trainedSkills = allSkills
            .filter((s) => s.visible && !s.lore)
            .sort(byLabel)
            .map((s) => ({
                slug: s.slug,
                label: s.label,
                // Null is meaningful: data prep falls back to the skill's attribute modifier
                base: s.base ?? null,
                note: s.note ?? "",
                // From source, not prepared data: rule elements can inject specials during prep,
                // and editing those would bake them into source
                special: this.#sourceSpecial(s.slug).map((sp) => ({
                    label: sp.label,
                    base: sp.base,
                    predicate: sp.predicate ? JSON.stringify(sp.predicate) : "",
                })),
            }));

        const loreSkills = allSkills
            .filter((s) => s.visible && s.lore)
            .sort(byLabel)
            .map((s) => ({ itemId: s.itemId ?? "", slug: s.slug, label: s.label, base: s.base ?? 0 }));

        const untrainedSkills = allSkills
            .filter((s) => !s.visible)
            .sort(byLabel)
            .map((s) => ({ slug: s.slug, label: s.label }));

        return {
            ...(await super._prepareContext(options)),
            foundryApp: this,
            state: { trainedSkills, loreSkills, untrainedSkills },
        };
    }

    #sourceSpecial(slug: string): NPCSpecialSkillSource[] {
        return this.#actor._source.system.skills?.[slug]?.special ?? [];
    }

    async addSkill(slug: string): Promise<void> {
        await this.#actor.update({ [`system.skills.${slug}`]: { base: 0 } });
    }

    async removeSkill(slug: string): Promise<void> {
        await this.#actor.update({ [`system.skills.${slug}`]: _del });
    }

    /** Creates a lore item, returning its id so the component can move focus to the new row. */
    async addLore(name: string): Promise<string | null> {
        const data: PreCreate<LoreSource> = {
            name,
            type: "lore",
            system: { mod: { value: 0 } },
        };
        const [lore] = await this.#actor.createEmbeddedDocuments("Item", [data]);
        return lore?.id ?? null;
    }

    async removeLore(itemId: string): Promise<void> {
        await this.#actor.items.get(itemId)?.delete();
    }

    editLore(itemId: string): void {
        this.#actor.items.get(itemId)?.sheet.render(true);
    }

    async updateSkillNote(slug: string, note: string): Promise<void> {
        await this.#actor.update({ [`system.skills.${slug}.note`]: note });
    }

    /** A null base defers to the skill's attribute modifier during data preparation */
    async updateSkillBase(slug: string, base: number | null): Promise<void> {
        await this.#actor.update({ [`system.skills.${slug}.base`]: base === null ? null : Math.trunc(base) || 0 });
    }

    async updateLoreMod(itemId: string, mod: number): Promise<void> {
        const clamped = Math.clamp(Math.trunc(mod) || 0, -999, 999);
        await this.#actor.items.get(itemId)?.update({ "system.mod.value": clamped });
    }

    async addSpecial(slug: string): Promise<void> {
        await this.#enqueueSpecialWrite(() => {
            const special = [...this.#sourceSpecial(slug), { label: "", base: 0 }];
            return this.#actor.update({ [`system.skills.${slug}.special`]: special });
        });
    }

    async removeSpecial(slug: string, index: number): Promise<void> {
        await this.#enqueueSpecialWrite(() => {
            const special = this.#sourceSpecial(slug).filter((_, i) => i !== index);
            return this.#actor.update({
                [`system.skills.${slug}.special`]: special.length ? special : _del,
            });
        });
    }

    async updateSpecialLabel(slug: string, index: number, label: string): Promise<void> {
        await this.#patchSpecial(slug, index, (target) => {
            target.label = label;
        });
    }

    async updateSpecialBase(slug: string, index: number, base: number): Promise<void> {
        await this.#patchSpecial(slug, index, (target) => {
            target.base = Math.trunc(base) || 0;
        });
    }

    /** Predicate is entered as a JSON string: parse and save it, returning whether it was a valid array */
    async updateSpecialPredicate(slug: string, index: number, raw: string): Promise<boolean> {
        const trimmed = raw.trim();
        const parsed = ((): unknown[] | null => {
            if (!trimmed) return [];
            try {
                const json: unknown = JSON.parse(trimmed);
                return Array.isArray(json) ? json : null;
            } catch {
                return null;
            }
        })();
        if (parsed === null) {
            ui.notifications.error(_loc("PF2E.Actor.NPC.SkillsEditor.Error.PredicateArray"));
            return false;
        }

        await this.#patchSpecial(slug, index, (target) => {
            if (parsed.length === 0) {
                delete target.predicate;
            } else {
                target.predicate = parsed;
            }
        });
        return true;
    }

    async #patchSpecial(
        slug: string,
        index: number,
        mutate: (target: { label: string; base: number; predicate?: unknown[] }) => void,
    ): Promise<void> {
        await this.#enqueueSpecialWrite(async () => {
            const special = fu.deepClone(this.#sourceSpecial(slug));
            if (index < 0 || index >= special.length) return;
            mutate(special[index]);
            await this.#actor.update({ [`system.skills.${slug}.special`]: special });
        });
    }

    /** Chain a special-array write behind all pending ones so each reads post-update source */
    #enqueueSpecialWrite<T>(write: () => Promise<T>): Promise<T> {
        const run = this.#specialWrites.then(write);
        this.#specialWrites = run.catch(() => {});
        return run;
    }
}

interface NPCSkillsEditorContext extends SvelteApplicationRenderContext {
    foundryApp: NPCSkillsEditor;
    state: NPCSkillsEditorState;
}

interface NPCSkillsEditorState {
    trainedSkills: {
        slug: string;
        label: string;
        base: number | null;
        note: string;
        special: { label: string; base: number; predicate: string }[];
    }[];
    loreSkills: { itemId: string; slug: string; label: string; base: number }[];
    untrainedSkills: { slug: string; label: string }[];
}

export { NPCSkillsEditor };
export type { NPCSkillsEditorContext, NPCSkillsEditorState };
