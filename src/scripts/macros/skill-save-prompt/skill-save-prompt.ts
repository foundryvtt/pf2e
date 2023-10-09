import { ActionDefaultOptions } from "@system/action-macros/types.ts";
import { adjustDC, calculateDC, calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import {
    dcAdjustmentsHtml,
    getActions,
    loreSkillsFromActiveParty,
    loreSkillsFromActors,
    proficiencyRanksHtml,
} from "./helpers.ts";
import { ProficiencyRank } from "@item/data/index.ts";
import { tagify } from "@util";
import * as R from "remeda";

export async function skillSavePrompt(options: ActionDefaultOptions = {}): Promise<void> {
    const dialog = new Dialog(
        {
            title: "Generate Skill/Save Prompt",
            content: `
                <form class="skill-save-prompt">
                    <div class="form-group">
                        <label for="title">Prompt Title</label>
                        <input id="title" name="title" type="text" />
                    </div>
                    <hr>
                    <nav class="dc-navigation">
                        <h4 class="sheet-tabs tabs" data-tab-container="primary">
                            <a class="active" data-tab="set-dc">Set DC</a>
                            <a data-tab="simple-dc">Simple DC</a>
                            <a data-tab="level-dc">Level-Based DC</a>
                        </h4>
                    </nav>
                    <section class="dc-content">
                        <section class="tab active" data-tab="set-dc">
                            <div class="form-group dc">
                                <label for="dc">Set DC</label>
                                <input id="dc" name="dc" type="text" />
                            </div>
                        </section>
                        <section class="tab active" data-tab="simple-dc">
                            <div class="form-group">
                                <label for="simple-dc">Simple DC</label>
                                <select id="simple-dc" name="simple-dc">
                                    <option></option>
                                    ${proficiencyRanksHtml()}
                                </select>
                            </div>
                        </section>
                        <section class="tab active" data-tab="level-dc">
                            <div class="form-group">
                                <label for="level-dc">Level</label>
                                <input id="level-dc" name="level-dc" type="text" />
                            </div>
                        </section>
                    </section>
                    <div class="form-group">
                        <label for="adjust-difficulty">Adjust Difficulty</label>
                        <select id="adjust-difficulty" name="adjust-difficulty">
                            <option></option>
                            ${dcAdjustmentsHtml()}
                        </select>
                    </div>
                    <hr>
                    <nav class="skill-save-navigation">
                        <h4 class="sheet-tabs tabs" data-tab-container="primary">
                            <a class="active" data-tab="skill">Skills</a>
                            <a data-tab="save">Saves</a>
                        </h4>
                    </nav>
                    <section class="skill-save-content">
                        <section class="tab skill-prompt active" data-tab="skill">
                            <div class="form-group">
                                <input id="skill" name="prompt.skills" placeholder="Choose Skills" data-dtype="JSON"></input>
                            </div>
                            <div class="form-group lores">
                                <input id="lores" name="prompt.lores" placeholder="Choose or Add Custom Lores" data-dtype="JSON"></input>
                            </div>
                            <div class="form-group">
                                <div class="form-group add-roll-options-group">
                                    <a class="add-roll-options"><i class="fas fa-plus"></i> Roll Options</a>
                                </div>   
                                <div class="form-group secret">
                                    <label for="secret">Secret Check</label> 
                                    <input id="secret" name="secret" type="checkbox" />  
                                </div> 
                            </div>
                            <div class="roll-options hidden">
                                <div class="form-group">
                                    
                                    <input id="actions" name="prompt.actions" placeholder="Actions" data-dtype="JSON"></input>
                                </div>
                                <div class="form-group">
                                    
                                    <input id="traits" name="prompt.traits" placeholder="Roll Options" data-dtype="JSON"></input>
                                </div>
                            </div>
                        </section>
                        <section class="tab save-prompt" data-tab="save">
                            <div class="form-group">
                                <input id="save" name="prompt.save" placeholder="Choose Saving Throws" data-dtype="JSON"></input>
                            </div>
                            <div class="form-group">
                                <label for="basic-save">Basic</label>
                                <input id="basic-save" name="basic-save" type="checkbox" />
                            </div>
                        </section>
                    </section>
                </form>
            `,
            buttons: {
                post: {
                    label: "Generate Prompt",
                    callback: generatePrompt,
                },
                cancel: {
                    label: "Cancel",
                },
            },
            default: "post",
            render: ($html: HTMLElement | JQuery) => _render($html, options),
        },
        {
            id: "generate-skill-save-prompt",
        }
    );

    dialog.render(true);
}

async function _render($html: HTMLElement | JQuery, options: ActionDefaultOptions): Promise<void> {
    const html = (<JQuery>$html)[0];

    // Set up tagify fields
    const skillEl = html.querySelector<HTMLInputElement>("input[name='prompt.skills']");
    tagify(skillEl, {
        whitelist: Object.fromEntries(Object.entries(CONFIG.PF2E.skillList).filter(([id, _]) => id !== "lore")),
    });

    const saveEl = html.querySelector<HTMLInputElement>("input[name='prompt.save']");
    tagify(saveEl, { whitelist: CONFIG.PF2E.saves });

    const loreEl = html.querySelector<HTMLInputElement>("input[name='prompt.lores']");
    const loreSkills = options.actors ? loreSkillsFromActors(options.actors) : loreSkillsFromActiveParty();
    const loreOptions = R.isEmpty(loreSkills) ? {} : { whitelist: loreSkills, enforceWhitelist: false };
    tagify(loreEl, loreOptions);

    const actionEl = html.querySelector<HTMLInputElement>("input[name='prompt.actions']");
    const actions = await getActions();
    tagify(actionEl, { whitelist: actions, enforceWhitelist: false });

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
}

function generatePrompt($html: HTMLElement | JQuery): void {
    const html = (<JQuery>$html)[0];

    let types: string[] = [];
    let traits: string[] = [];
    const extras: string[] = [];
    const activeSkillSaveTab = html.querySelector("section.skill-save-content section.tab.active");
    if (activeSkillSaveTab instanceof HTMLElement) {
        if (activeSkillSaveTab?.dataset.tab === "skill") {
            // get skill tags
            types = types.concat(_getTags(html, "input#skill"));
            // get lore tags
            types = types.concat(_getTags(html, "input#lores").map((t) => _prepareLoreType(t)));

            // get trait tags
            traits = traits.concat(_getTags(html, "input#traits"));
            // get action tags
            traits = traits.concat(_getTags(html, "input#actions").map((a) => _prepareActionType(a)));

            if (!!html.querySelector("input#secret:checked") && !traits.includes("secret")) {
                traits.push("secret");
            }
        } else if (activeSkillSaveTab?.dataset.tab === "save") {
            types = _getTags(html, "input#save");
            if (html.querySelector("input#basic-save:checked")) extras.push("basic:true");
        }
    }

    if (types.length) {
        let flavor = "";
        const titleEl = html.querySelector("input#title");
        if (titleEl instanceof HTMLInputElement && titleEl.value) {
            flavor = `<h4 class="action"><strong>${titleEl.value}</strong></h4><hr>`;
        }

        const dc = _getDC(html);
        const content = types.map((type) => _prepareCheck(type, dc, traits, extras)).join("");

        ChatMessage.create({
            user: game.user.id,
            flavor,
            content,
        });
    }
}

function _getDC(html: HTMLElement): string | undefined {
    const pwlSetting = game.settings.get("pf2e", "proficiencyVariant");
    const proficiencyWithoutLevel = pwlSetting === "ProficiencyWithoutLevel";

    let dc: string | undefined = undefined;
    const activeDCTab = html.querySelector("section.dc-content section.tab.active");
    if (activeDCTab instanceof HTMLElement) {
        if (activeDCTab?.dataset.tab === "set-dc") {
            dc = html.querySelector<HTMLInputElement>("input#dc")?.value;
        } else if (activeDCTab?.dataset.tab === "simple-dc") {
            const profRank = html.querySelector<HTMLInputElement>("select#simple-dc")?.value as ProficiencyRank;
            if (profRank) dc = calculateSimpleDC(profRank, { proficiencyWithoutLevel }).toString();
        } else if (activeDCTab?.dataset.tab === "level-dc") {
            const level = html.querySelector<HTMLInputElement>("input#level-dc")?.value;
            if (level) dc = calculateDC(+level, { proficiencyWithoutLevel }).toString();
        }
    }

    if (dc) {
        const dcAdjustment = html.querySelector<HTMLInputElement>("select#adjust-difficulty")?.value as DCAdjustment;
        if (dcAdjustment) dc = adjustDC(+dc, dcAdjustment).toString();
    }

    return dc;
}

function _getTags(html: HTMLElement, selector: string): string[] {
    const el = html.querySelector(selector);
    const tagArray: TagifyValue[] = el instanceof HTMLInputElement && el.value ? JSON.parse(el.value) : [];
    return tagArray.map((tag) => tag.id || tag.value);
}

function _prepareLoreType(type: string): string {
    let loreType = type.toLowerCase().replaceAll(" ", "-").trim();
    if (!loreType.includes("lore")) loreType = loreType.concat("-lore");
    return loreType;
}

function _prepareActionType(type: string): string {
    return `action:${type.toLowerCase().replace("action:", "").trim()}`;
}

function _prepareCheck(type: string, dc: string | undefined, traits: string[], extras: string[]): string {
    const parts = [type, dc ? `dc:${dc}` : null, traits.length ? `traits:${traits.join(",")}` : null]
        .concat(...extras)
        .filter((p) => p);
    return `<p>@Check[${parts.join("|")}]</p>`;
}

interface TagifyValue {
    id: string;
    value: string;
}
