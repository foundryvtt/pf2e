import { CharacterPF2e } from "@actor";
import { ActionDefaultOptions } from "@system/action-macros/types.ts";
import { adjustDC, calculateDC, calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { getActions, loreSkillsFromActiveParty, loreSkillsFromActors } from "./helpers.ts";
import { ProficiencyRank } from "@item/data/index.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { htmlQuery, signedInteger, tagify } from "@util";
import * as R from "remeda";

interface SkillSavePromptDialogOptions extends ApplicationOptions {
    actors: CharacterPF2e[];
}

interface SkillSavePromptDialogData {
    proficiencyRanks: SelectData[];
    dcAdjustments: SelectData[];
}

interface SelectData {
    value: string;
    label: string;
}

interface TagifyValue {
    id: string;
    value: string;
}

class SkillSavePromptDialog extends Application<SkillSavePromptDialogOptions> {
    #actions?: Record<string, string>;
    #lores?: Record<string, string>;

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["dialog"],
            id: "generate-skill-save-prompt",
            template: "systems/pf2e/templates/gm/skill-save-prompt/skill-save-prompt.hbs",
            title: game.i18n.localize("PF2E.Actor.Party.SkillSavePrompt.Title"),
            width: 400,
        };
    }

    override async getData(): Promise<SkillSavePromptDialogData> {
        this.#actions = await getActions();
        this.#lores = this.options.actors ? loreSkillsFromActors(this.options.actors) : loreSkillsFromActiveParty();

        return {
            proficiencyRanks: this.#prepareProficiencyRanks(),
            dcAdjustments: this.#prepareDCAdjustments(),
        };
    }

    #prepareProficiencyRanks(): SelectData[] {
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant");
        return PROFICIENCY_RANKS.map((value) => ({
            value,
            label: `${value} (${calculateSimpleDC(value, { proficiencyWithoutLevel })})`,
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

        // Set up tagify fields

        const skillEl = html.querySelector<HTMLInputElement>("input[name='prompt.skills']");
        const skills = Object.fromEntries(Object.entries(CONFIG.PF2E.skillList).filter(([id, _]) => id !== "lore"));
        tagify(skillEl, { whitelist: skills });

        const saveEl = html.querySelector<HTMLInputElement>("input[name='prompt.save']");
        tagify(saveEl, { whitelist: CONFIG.PF2E.saves });

        const loreEl = html.querySelector<HTMLInputElement>("input[name='prompt.lores']");
        const loreOptions = R.isEmpty(this.#lores || {}) ? {} : { whitelist: this.#lores };
        tagify(loreEl, loreOptions);

        const actionEl = html.querySelector<HTMLInputElement>("input[name='prompt.actions']");
        const actionOptions = R.isEmpty(this.#actions || {})
            ? {}
            : { whitelist: this.#actions, enforceWhitelist: false };
        tagify(actionEl, actionOptions);

        const traitEl = html.querySelector<HTMLInputElement>("input[name='prompt.traits']");
        tagify(traitEl, { whitelist: CONFIG.PF2E.actionTraits, enforceWhitelist: false });

        // Setup tabs

        const skillSaveTabs = new Tabs({
            navSelector: ".skill-save-navigation",
            contentSelector: ".skill-save-content",
            initial: "skill",
            callback: () => {},
        });
        skillSaveTabs.bind(html);

        const dcTabs = new Tabs({
            navSelector: ".dc-navigation",
            contentSelector: ".dc-content",
            initial: "set-dc",
            callback: () => {},
        });
        dcTabs.bind(html);

        // Show or hide Roll Options
        html.querySelector("div.form-group a.add-roll-options")?.addEventListener("click", () => {
            const rollOptionsEl = html.querySelector("div.roll-options");
            const rollOptionsAnchor = html.querySelector("div.form-group a.add-roll-options");

            if (rollOptionsEl && rollOptionsAnchor) {
                if (rollOptionsEl.classList.contains("hidden")) {
                    rollOptionsEl.classList.remove("hidden");
                    rollOptionsAnchor.innerHTML = `<i class="fas fa-minus"></i> Roll Options`;
                } else {
                    rollOptionsEl.classList.add("hidden");
                    rollOptionsAnchor.innerHTML = `<i class="fas fa-plus"></i> Roll Options`;
                }
            }
        });

        // Setup buttons
        htmlQuery(html, "[data-action=post]")?.addEventListener("click", async () => {
            this.generatePrompt($html);
            this.close();
        });

        htmlQuery(html, "[data-action=cancel]")?.addEventListener("click", async () => {
            this.close();
        });
    }

    generatePrompt($html: HTMLElement | JQuery): void {
        const html = (<JQuery>$html)[0];

        let types: string[] = [];
        let traits: string[] = [];
        const extras: string[] = [];
        const activeSkillSaveTab = htmlQuery(html, "section.skill-save-content section.tab.active");
        if (activeSkillSaveTab?.dataset.tab === "skill") {
            // get skill tags
            types = types.concat(this.#htmlQueryTags(html, "input#skill"));
            // get lore tags
            types = types.concat(this.#htmlQueryTags(html, "input#lores").map((t) => this.#formatLoreType(t)));

            // get trait tags
            traits = traits.concat(this.#htmlQueryTags(html, "input#traits"));
            // get action tags
            traits = traits.concat(this.#htmlQueryTags(html, "input#actions").map((a) => this.#formatActionType(a)));

            if (!!html.querySelector("input#secret:checked") && !traits.includes("secret")) {
                traits.push("secret");
            }
        } else if (activeSkillSaveTab?.dataset.tab === "save") {
            types = this.#htmlQueryTags(html, "input#save");
            if (htmlQuery(html, "input#basic-save:checked")) extras.push("basic:true");
        }

        if (types.length) {
            let flavor = "";
            const titleEl = htmlQuery(html, "input#title");
            if (titleEl instanceof HTMLInputElement && titleEl.value) {
                flavor = `<h4 class="action"><strong>${titleEl.value}</strong></h4><hr>`;
            }

            const dc = this.#getDC(html);
            const content = types.map((type) => this.#constructCheck(type, dc, traits, extras)).join("");

            ChatMessage.create({
                user: game.user.id,
                flavor,
                content,
            });
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

    #getDC(html: HTMLElement): string | undefined {
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant");

        let dc: string | undefined = undefined;
        const activeDCTab = htmlQuery(html, "section.dc-content section.tab.active");
        if (activeDCTab?.dataset.tab === "set-dc") {
            dc = htmlQuery<HTMLInputElement>(html, "input#dc")?.value;
        } else if (activeDCTab?.dataset.tab === "simple-dc") {
            const profRank = htmlQuery<HTMLInputElement>(html, "select#simple-dc")?.value as ProficiencyRank;
            if (profRank) dc = calculateSimpleDC(profRank, { proficiencyWithoutLevel }).toString();
        } else if (activeDCTab?.dataset.tab === "level-dc") {
            const level = htmlQuery<HTMLInputElement>(html, "input#level-dc")?.value;
            if (level) dc = calculateDC(+level, { proficiencyWithoutLevel }).toString();
        }

        if (dc) {
            const dcAdjustment = htmlQuery<HTMLInputElement>(html, "select#adjust-difficulty")?.value as DCAdjustment;
            if (dcAdjustment) dc = adjustDC(+dc, dcAdjustment).toString();
        }

        return dc;
    }

    #constructCheck(type: string, dc: string | undefined, traits: string[], extras: string[]): string {
        const parts = [type, dc ? `dc:${dc}` : null, traits.length ? `traits:${traits.join(",")}` : null]
            .concat(...extras)
            .filter((p) => p);
        return `<p>@Check[${parts.join("|")}]</p>`;
    }
}

export async function skillSavePrompt(options: ActionDefaultOptions = {}): Promise<void> {
    new SkillSavePromptDialog(options.actors ? { actors: options.actors as CharacterPF2e[] } : {}).render(true);
}
