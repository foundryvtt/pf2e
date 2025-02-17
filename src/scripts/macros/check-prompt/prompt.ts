import type { CharacterPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { adjustDC, calculateDC, calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { ActionDefaultOptions } from "@system/action-macros/types.ts";
import { htmlQuery, signedInteger, tupleHasValue } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";
import { getActions, getMacros, getVariants, loreSkillsFromActors } from "./helpers.ts";

interface CheckPromptDialogOptions extends ApplicationOptions {
    actors: CharacterPF2e[];
}

interface CheckPromptDialogData {
    proficiencyRanks: SelectData[];
    dcAdjustments: SelectData[];
    partyLevel: number | null;
}

interface SelectData {
    value: string;
    label: string;
}

interface TagifyValue {
    id: string;
    value: string;
}

class CheckPromptDialog extends Application<CheckPromptDialogOptions> {
    #actions?: Record<string, string>;
    #lores?: Record<string, string>;
    #macros?: Record<string, string>;
    #variants?: Record<string, string>;

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["dialog"],
            id: "generate-check-prompt",
            tabs: [
                { navSelector: ".skill-save-navigation", contentSelector: ".check-prompt-content", initial: "skills" },
                { navSelector: ".dc-navigation", contentSelector: ".dc-content", initial: "set-dc" },
            ],
            template: "systems/pf2e/templates/gm/check-prompt.hbs",
            title: game.i18n.localize("PF2E.Actor.Party.CheckPrompt.Title"),
            width: 400,
            height: "auto",
        };
    }

    override async getData(): Promise<CheckPromptDialogData> {
        this.#actions = await getActions();
        this.#macros = getMacros();
        this.#variants = getVariants();
        this.#lores = loreSkillsFromActors(this.options.actors ?? game.actors.party?.members ?? []);

        return {
            proficiencyRanks: this.#prepareProficiencyRanks(),
            dcAdjustments: this.#prepareDCAdjustments(),
            partyLevel: game.actors.party?.level ?? null,
        };
    }

    #prepareProficiencyRanks(): SelectData[] {
        const pwol = game.pf2e.settings.variants.pwol.enabled;
        return PROFICIENCY_RANKS.map((value) => ({
            value,
            label: `${value} (${calculateSimpleDC(value, { pwol })})`,
        }));
    }

    #prepareDCAdjustments(): SelectData[] {
        return Object.entries(CONFIG.PF2E.dcAdjustments)
            .filter(([value, _]) => value !== "normal")
            .map(([value, name]) => {
                return {
                    value,
                    label: `${game.i18n.localize(name)} (${signedInteger(adjustDC(0, value as DCAdjustment))})`,
                };
            });
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        const html = $html[0];

        const skillsAndLoresEl = html.querySelector<HTMLInputElement>("input#check-prompt-skills");
        const skillsAndLores = {
            ...R.mapValues(CONFIG.PF2E.skills, (s) => s.label),
            ...(R.isEmpty(this.#lores || {}) ? {} : this.#lores),
            perception: "PF2E.PerceptionLabel",
        };
        tagify(skillsAndLoresEl, { whitelist: skillsAndLores });

        const saveEl = html.querySelector<HTMLInputElement>("input#check-prompt-saves");
        tagify(saveEl, { whitelist: CONFIG.PF2E.saves });

        const actionEl = html.querySelector<HTMLInputElement>("input#check-prompt-actions");
        const actionOptions = R.isEmpty(this.#macros || {}) ? {} : { whitelist: this.#macros, maxTags: 1 };
        tagify(actionEl, actionOptions);

        const variantsEl = html.querySelector<HTMLInputElement>("input#check-prompt-variants");
        const variants = R.isEmpty(this.#variants || {}) ? {} : { whitelist: this.#variants, maxTags: 1 };
        tagify(variantsEl, variants);

        const traitEl = html.querySelector<HTMLInputElement>("input#check-prompt-traits");
        tagify(traitEl, { whitelist: CONFIG.PF2E.actionTraits, enforceWhitelist: false });

        const actionTraitEl = html.querySelector<HTMLInputElement>("input#check-prompt-action-traits");
        const actionTraits = R.isEmpty(this.#actions || {})
            ? {}
            : { whitelist: this.#actions, enforceWhitelist: false };
        tagify(actionTraitEl, actionTraits);

        // Show or hide Roll Options
        html.querySelector("div.form-group a.add-roll-options")?.addEventListener("click", () => {
            const sectionEl = html.querySelector("section.check-prompt-content");
            if (sectionEl) sectionEl.classList.toggle("show-roll-options");
        });

        // Setup buttons
        htmlQuery(html, "[data-action=post]")?.addEventListener("click", async () => {
            this.#generatePrompt();
        });

        htmlQuery(html, "[data-action=cancel]")?.addEventListener("click", async () => {
            this.close();
        });
    }

    #generatePrompt(): void {
        const html = this.element[0];
        const types: string[] = [];
        const traits: string[] = [];
        const actions: string[] = [];
        const variants: string[] = [];
        const extras: string[] = [];
        const activeSkillSaveTab = htmlQuery(html, "section.check-prompt-content section.tab.active");
        if (activeSkillSaveTab?.dataset.tab === "skills") {
            // get action tags
            actions.push(
                ...this.#htmlQueryTags(html, "input#check-prompt-actions").map((a) =>
                    a.toLowerCase().replace("action:", "").trim(),
                ),
            );
            variants.push(
                ...this.#htmlQueryTags(html, "input#check-prompt-variants").map((v) => v.toLowerCase().trim()),
            );
            // get skill tags
            types.push(...this.#htmlQueryTags(html, "input#check-prompt-skills"));
            // get lore tags
            types.push(...this.#htmlQueryTags(html, "input#check-prompt-lores").map((t) => this.#formatLoreType(t)));

            // get trait tags
            traits.push(...this.#htmlQueryTags(html, "input#check-prompt-traits"));
            traits.push(
                ...this.#htmlQueryTags(html, "input#check-prompt-action-traits").map((a) => this.#formatActionType(a)),
            );

            if (!!html.querySelector("input#check-prompt-secret:checked") && !traits.includes("secret")) {
                traits.push("secret");
            }
        } else if (activeSkillSaveTab?.dataset.tab === "saves") {
            types.push(...this.#htmlQueryTags(html, "input#check-prompt-saves"));
            if (htmlQuery(html, "input#check-prompt-basic-save:checked")) extras.push("basic:true");
        }

        if (types.length > 0 || actions.length > 0) {
            const titleEl = htmlQuery<HTMLInputElement>(html, "input#check-prompt-title");
            const flavor = titleEl?.value ? `<h4 class="action"><strong>${titleEl.value}</strong></h4><hr>` : "";

            const dc = this.#getDC(html);
            let content: string = "";
            if (actions.length > 0 && types.length > 0) {
                content = types.map((type) => this.#constructAction(actions[0], variants[0], dc, type, traits)).join("");
            } else if (actions.length > 0 && types.length === 0) {
                content = actions.map((action) => this.#constructAction(action, variants[0], dc, null, traits)).join("");
            } else {
                content = types.map((type) => this.#constructCheck(type, dc, traits, extras)).join("");
            }

            ChatMessagePF2e.create({ author: game.user.id, flavor, content });
        }
    }

    #htmlQueryTags(html: HTMLElement, selector: string): string[] {
        const el = htmlQuery(html, selector);
        const tagArray: TagifyValue[] = el instanceof HTMLInputElement && el.value ? JSON.parse(el.value) : [];
        return tagArray.map((tag) => tag.id || tag.value);
    }

    #formatLoreType(type: string): string {
        let loreType = type.toLowerCase().replaceAll(" ", "-").trim();
        if (!loreType.includes("lore")) loreType = loreType.concat("-lore");
        return loreType;
    }

    #formatActionType(type: string): string {
        return `action:${type.toLowerCase().replace("action:", "").trim()}`;
    }

    #getDC(html: HTMLElement): number | null {
        const dc = ((): number => {
            const pwol = game.pf2e.settings.variants.pwol.enabled;
            const activeDCTab = htmlQuery(html, "section.dc-content section.tab.active");
            if (activeDCTab?.dataset.tab === "set-dc") {
                return Number(htmlQuery<HTMLInputElement>(html, "input#check-prompt-dc")?.value || NaN);
            } else if (activeDCTab?.dataset.tab === "simple-dc") {
                const profRank = htmlQuery<HTMLInputElement>(html, "select#check-prompt-simple-dc")?.value;
                if (tupleHasValue(PROFICIENCY_RANKS, profRank)) {
                    return calculateSimpleDC(profRank, { pwol });
                }
            } else if (activeDCTab?.dataset.tab === "level-dc") {
                const level = Number(htmlQuery<HTMLInputElement>(html, "input#check-prompt-level-dc")?.value || NaN);
                if (Number.isInteger(level)) return calculateDC(+level, { pwol });
            }
            return NaN;
        })();

        if (Number.isInteger(dc)) {
            const dcAdjustment = htmlQuery<HTMLInputElement>(html, "select#check-prompt-adjust-difficulty")
                ?.value as DCAdjustment;
            return dcAdjustment ? adjustDC(dc, dcAdjustment) : dc;
        }

        return null;
    }

    #constructCheck(type: string, dc: number | null, traits: string[], extras: string[]): string {
        const parts = [
            type,
            Number.isInteger(dc) ? `dc:${dc}` : null,
            traits.length ? `traits:${traits.join(",")}` : null,
        ]
            .concat(...extras)
            .filter((p) => p);
        return `<p>@Check[${parts.join("|")}]</p>`;
    }

    #constructAction(action: string, variant: string | null, dc: number | null, statistic: string | null, traits: string[]): string {
        const parts = [
            action,
            variant ? `variant=${variant}` : null,
            statistic ? `statistic=${statistic}` : null,
            Number.isInteger(dc) ? `dc=${dc}` : null,
            traits.length ? `traits=${traits.join(",")}` : null,
        ];
        return `[[/act ${parts.join(" ")}]]`;
    }
}

export async function checkPrompt(options: ActionDefaultOptions = {}): Promise<void> {
    new CheckPromptDialog(options.actors ? { actors: options.actors as CharacterPF2e[] } : {}).render(true);
}
