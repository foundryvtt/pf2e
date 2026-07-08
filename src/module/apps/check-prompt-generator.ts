import type { ActorPF2e, CharacterPF2e } from "@actor";
import type { FormFooterButton } from "@client/applications/_types.d.mts";
import type HTMLRangePickerElement from "@client/applications/elements/range-picker.d.mts";
import type FormDataExtended from "@client/applications/ux/form-data-extended.d.mts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { adjustDC, calculateDC, calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { signedInteger, tupleHasValue } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";

interface CheckPromptDialogOptions extends fa.ApplicationConfiguration {
    actors: CharacterPF2e[];
}

interface CheckPromptRenderContext extends fa.ApplicationRenderContext {
    rootId: string;
    proficiencyRanks?: SelectData[];
    dcAdjustments?: SelectData[];
    partyLevel?: number;
    buttons?: FormFooterButton[];
}

interface SelectData {
    value: string;
    label: string;
}

interface TagifyValue {
    id: string;
    value: string;
}

class CheckPromptGenerator extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2<CheckPromptDialogOptions>) {
    #actions?: Record<string, string>;
    #lores?: Record<string, string>;

    static override DEFAULT_OPTIONS: DeepPartial<CheckPromptDialogOptions> = {
        id: "check-prompt-generator",
        tag: "form",
        window: {
            icon: "fa-solid fa-dice-d20",
            title: "PF2E.Actor.Party.CheckPrompt.Title",
            contentClasses: ["standard-form"],
        },
        position: { width: 420 },
        form: { handler: CheckPromptGenerator.#onSubmit },
        actions: { toggleRollOptions: CheckPromptGenerator.#onClickToggleRollOptions },
    };

    static override PARTS = {
        title: { template: `systems/${SYSTEM_ID}/templates/gm/check-prompt/title.hbs` },
        dcTabs: { template: "templates/generic/tab-navigation.hbs" },
        dc: { template: `systems/${SYSTEM_ID}/templates/gm/check-prompt/dc.hbs` },
        checksTabs: { template: "templates/generic/tab-navigation.hbs" },
        checks: { template: `systems/${SYSTEM_ID}/templates/gm/check-prompt/checks.hbs` },
        footer: { template: "templates/generic/form-footer.hbs" },
    };

    static override TABS = {
        dc: {
            tabs: [{ id: "static" }, { id: "simple" }, { id: "level" }],
            initial: "static",
            labelPrefix: "PF2E.Actor.Party.CheckPrompt.DCTabs",
        },
        checks: {
            tabs: [
                { id: "skills", label: "PF2E.Actor.Party.CheckPrompt.SkillsPerception" },
                { id: "saves", label: "PF2E.SavesHeader" },
            ],
            initial: "skills",
        },
    };

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<CheckPromptRenderContext> {
        const context = await super._prepareContext(options);
        this.#actions ??= await this.#getActions();
        this.#lores ??= this.#loreSkillsFromActors();
        return Object.assign(context, { rootId: "check-prompt" });
    }

    protected override async _preparePartContext(
        partId: string,
        context: CheckPromptRenderContext,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<CheckPromptRenderContext> {
        const partContext = (await super._preparePartContext(partId, context, options)) as CheckPromptRenderContext;
        switch (partId) {
            case "dcTabs":
                partContext.tabs = this._prepareTabs("dc");
                partContext.proficiencyRanks = this.#prepareProficiencyRanks();
                partContext.dcAdjustments = this.#prepareDCAdjustments();
                break;
            case "dc":
                partContext.partyLevel = game.actors.party?.level || 1;
                break;
            case "checksTabs":
                partContext.tabs = this._prepareTabs("checks");
                break;
            case "footer":
                partContext.buttons = [
                    { type: "submit", label: "PF2E.Actor.Party.CheckPrompt.Submit" },
                    { type: "button", label: "COMMON.Cancel", action: "close" },
                ];
        }
        return partContext;
    }

    async #getActions(): Promise<Record<string, string>> {
        const indexFields = ["system.slug"];
        const pack = game.packs.get(SYSTEM_ID === "pf2e" ? "pf2e.actionspf2e" : "sf2e.actions", { strict: true });
        const index = await pack.getIndex({ fields: indexFields });
        return Object.fromEntries(index.map((a) => [a.system.slug, a.name]));
    }

    #loreSkillsFromActors(): Record<string, string> {
        return Object.fromEntries(
            this.options.actors
                .flatMap((m) => Object.values(m.skills))
                .filter((s) => s.lore)
                .map((s) => [s.slug, s.label]),
        );
    }

    #prepareProficiencyRanks(): SelectData[] {
        const pwol = game.pf2e.settings.variants.pwol.enabled;
        return PROFICIENCY_RANKS.map((value, index) => ({
            value,
            label: `${_loc(`PF2E.ProficiencyLevel${index}`)} (${calculateSimpleDC(value, { pwol })})`,
        }));
    }

    #prepareDCAdjustments(): SelectData[] {
        return Object.entries(CONFIG.PF2E.dcAdjustments)
            .filter(([value]) => value !== "normal")
            .map(([value, label]) => {
                return {
                    value,
                    label: `${_loc(label).titleCase()} (${signedInteger(adjustDC(0, value as DCAdjustment))})`,
                };
            });
    }

    protected override async _onRender(context: object, options: fa.ApplicationRenderOptions): Promise<void> {
        await super._onRender(context, options);
        const html = this.element;

        // Set up tagify fields
        const skillEl = html.querySelector<HTMLInputElement>("input[name=skills]");
        const skills = {
            ...R.mapValues(CONFIG.PF2E.skills, (s) => s.label),
            perception: "PF2E.PerceptionLabel",
        };
        tagify(skillEl, { whitelist: skills });
        const saveEl = html.querySelector<HTMLInputElement>("input[name=saves]");
        tagify(saveEl, { whitelist: CONFIG.PF2E.saves });
        const loreEl = html.querySelector<HTMLInputElement>("input[name=lores]");
        const loreOptions = R.isEmpty(this.#lores || {}) ? {} : { whitelist: this.#lores };
        tagify(loreEl, loreOptions);
        const actionEl = html.querySelector<HTMLInputElement>("input[name=actions]");
        const actionOptions = R.isEmpty(this.#actions || {})
            ? {}
            : { whitelist: this.#actions, enforceWhitelist: false };
        tagify(actionEl, actionOptions);
        const traitEl = html.querySelector<HTMLInputElement>("input[name=traits]");
        tagify(traitEl, { whitelist: CONFIG.PF2E.actionTraits, enforceWhitelist: false });

        // Show or hide Roll Options
        html.querySelector("div.form-group a.add-roll-options")?.addEventListener("click", () => {
            const sectionEl = html.querySelector("section.check-prompt-content");
            if (sectionEl) sectionEl.classList.toggle("show-roll-options");
        });
    }

    /** Trigger a change event to re-render the output preview. */
    override changeTab(
        tab: string,
        group: string,
        options?: { event?: Event; navElement?: HTMLElement; force?: boolean; updatePosition?: boolean },
    ): void {
        super.changeTab(tab, group, options);
        this.element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }

    protected override _onChangeForm(formConfig: fa.ApplicationFormConfiguration, event: Event): void {
        super._onChangeForm(formConfig, event);
        const submitData = new fa.ux.FormDataExtended(this.element as HTMLFormElement).object;
        const checks = this.#generateChecks(submitData).join("\n");
        const preview = this.element.querySelector<HTMLTextAreaElement>("textarea#check-prompt-preview");
        if (preview) preview.value = checks;
    }

    static async #onClickToggleRollOptions(_event: PointerEvent, button: HTMLButtonElement): Promise<void> {
        const section = button.closest<HTMLElement>("section");
        section?.classList.toggle("collapsed", !section.classList.contains("collapsed"));
    }

    static async #onSubmit(
        this: CheckPromptGenerator,
        _event: SubmitEvent,
        _form: HTMLFormElement,
        formData: FormDataExtended,
    ): Promise<void> {
        const checks = this.#generateChecks(formData.object);
        if (!checks.length) return;
        const content = checks.map((c) => `<p>${c}</p>`).join("\n");
        const titleEl = this.element.querySelector<HTMLInputElement>("input[name=title]");
        const flavor = titleEl?.value ? `<h4 class="action"><strong>${titleEl.value}</strong></h4><hr>` : "";
        await ChatMessagePF2e.create({ author: game.user.id, flavor, content });
    }

    /** Generate a `@Check` string from form submission data. */
    #generateChecks(submitData: Record<string, unknown>): string[] {
        const types: string[] = [];
        const traits: string[] = [];
        const extras: string[] = [];
        if (this.tabGroups.checks === "skills") {
            // get skill tags
            types.push(...this.#htmlQueryTags("input[name=skills]"));
            // get lore tags
            types.push(...this.#htmlQueryTags("input[name=lores]").map((t) => this.#formatLoreType(t)));

            // get trait tags
            traits.push(...this.#htmlQueryTags("input[name=traits]"));
            // get action tags
            traits.push(...this.#htmlQueryTags("input[name=actions]").map((a) => this.#formatActionType(a)));
            if (submitData["secret"] && !traits.includes("secret")) traits.push("secret");
        } else if (this.tabGroups.checks === "saves") {
            types.push(...this.#htmlQueryTags("input[name=saves]"));
            if (submitData["basic-save"]) extras.push("basic");
        }
        if (types.length) {
            const dc = this.#getDC();
            return types.map((type) => this.#generateCheck(type, dc, traits, extras));
        }
        return [];
    }

    #generateCheck(type: string, dc: number | null, traits: string[], extras: string[]): string {
        const parts = [
            type,
            Number.isInteger(dc) ? `dc:${dc}` : null,
            traits.length ? `traits:${traits.join(",")}` : null,
        ]
            .concat(...extras)
            .filter((p) => p);
        return `@Check[${parts.join("|")}]`;
    }

    #htmlQueryTags(selector: string): string[] {
        const tagsEl = this.element.querySelector(selector);
        const tags: TagifyValue[] = tagsEl instanceof HTMLInputElement && tagsEl.value ? JSON.parse(tagsEl.value) : [];
        return tags.map((t) => t.id || t.value);
    }

    #formatLoreType(type: string): string {
        let loreType = type.toLowerCase().replaceAll(" ", "-").trim();
        if (!loreType.includes("lore")) loreType = loreType.concat("-lore");
        return loreType;
    }

    #formatActionType(type: string): string {
        return `action:${type.toLowerCase().replace("action:", "").trim()}`;
    }

    #getDC(): number | null {
        const html = this.element;
        const dc = ((): number => {
            const pwol = game.pf2e.settings.variants.pwol.enabled;
            switch (this.tabGroups.dc) {
                case "static":
                    return Number(html.querySelector<HTMLInputElement>("input[name=static-dc]")?.value || NaN);
                case "simple": {
                    const profRank = html.querySelector<HTMLSelectElement>("select[name=simple-dc]")?.value;
                    return tupleHasValue(PROFICIENCY_RANKS, profRank)
                        ? calculateSimpleDC(profRank, { pwol })
                        : Number.NaN;
                }
                case "level": {
                    const rangePicker = html.querySelector<HTMLRangePickerElement>("range-picker[name=level-dc]");
                    const level = Number(rangePicker?.value || NaN);
                    return Number.isInteger(level) ? calculateDC(+level, { pwol }) : Number.NaN;
                }
                default:
                    return Number.NaN;
            }
        })();

        if (Number.isInteger(dc)) {
            const selectEl = html.querySelector<HTMLSelectElement>("select[name=adjust-difficulty]");
            const dcAdjustment = selectEl?.value as DCAdjustment | undefined;
            return dcAdjustment ? adjustDC(dc, dcAdjustment) : dc;
        }

        return null;
    }
}

export async function checkPrompt(options?: { actors?: ActorPF2e[] }): Promise<void> {
    const actors = options?.actors ?? game.actors.party?.members ?? [];
    const characters = actors.filter((a): a is CharacterPF2e => a.type === "character");
    new CheckPromptGenerator({ actors: characters }).render(true);
}
