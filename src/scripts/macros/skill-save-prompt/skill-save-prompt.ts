import { ActionDefaultOptions } from "@system/action-macros/types.ts";
import { adjustDC, DCAdjustment } from "@module/dc.ts";
import { dcAdjustmentsHtml, getActions, loreSkillsFromActiveParty, loreSkillsFromActors } from "./helpers.ts";
import { dcTools } from "./dc-tools.ts";
import { tagify } from "@util";
import * as R from "remeda";

export async function skillSavePrompt(options: ActionDefaultOptions = {}): Promise<void> {
    const dialog = new Dialog({
            title: "Generate Skill/Save Prompt",
            content: `
                <form class="skill-save-prompt">
                    <div class="form-group">
                        <label for="title">Prompt Title</label>
                        <input id="title" name="title" type="text" />
                    </div>
                    <hr>
                    <div class="form-group dc">
                        <label for="dc">DC</label>
                        <input id="dc" name="dc" type="text" />
                        <i class="fa-solid fa-wrench"></i>
                    </div>
                    <div class="form-group">
                        <label for="adjust-difficulty">Adjust Difficulty</label>
                        <select id="adjust-difficulty" name="adjust-difficulty">
                            <option></option>
                            ${dcAdjustmentsHtml()}
                        </select>
                    </div>
                    <hr>
                    <nav class="sheet-navigation">
                        <h4 class="sheet-tabs tabs" data-tab-container="primary">
                            <a class="active" data-tab="skill">Skills</a>
                            <a data-tab="save">Saves</a>
                        </h4>
                    </nav>
                    <section class="sheet-content">
                        <section class="tab item-skill active" data-tab="skill">
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
                        <section class="tab item-save" data-tab="save">
                            <div class="form-group">
                                <input id="save" name="prompt.save" placeholder="Choose Saving Throws" data-dtype="JSON"></input>
                            </div>
                            <div class="form-group">
                                <label for="basic-save">Basic</label>
                                <input id="basic-save" name="basic-save" type="checkbox" />
                            </div>
                        </section>
                    </section
                </form>
            `,
            buttons: {
                    post: {
                            label: "Generate Prompt",
                            callback: generatePrompt
                    },
                    cancel: {
                            label: "Cancel",
                    },
            },
            default: "post",
            render: ($html: HTMLElement | JQuery) => _render($html, options)
        }, {
            id: "generate-skill-save-prompt"
    });
    
    dialog.render(true);
}

async function _render($html: HTMLElement | JQuery, options: ActionDefaultOptions): Promise<void> {
    const html = (<JQuery>$html)[0];

    // Set up tagify fields
    const skillEl = html.querySelector<HTMLInputElement>("input[name='prompt.skills']");
    tagify(skillEl, { whitelist: 
        Object.fromEntries(Object.entries(CONFIG.PF2E.skillList).filter(([id, _]) => id !== "lore" )) 
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
    const tabs = new Tabs({
        navSelector: ".sheet-navigation", 
        contentSelector: ".sheet-content", 
        initial: "skill",
        callback: () => {} 
    });
    tabs.bind(html);

    // Open DC calculation dialog when clicked
    html.querySelector("div.form-group.dc i.fa-solid.fa-wrench")?.addEventListener("click", () => {
        dcTools();
    });

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
};

function generatePrompt($html: HTMLElement | JQuery): void {
    const html = (<JQuery>$html)[0];

    let types: string[] = [];
    let traits: string[] = [];
    let extras: string[] = [];
    const activeTab = html.querySelector("section.tab.active");
    if (activeTab instanceof HTMLElement) {
        if (activeTab?.dataset.tab == "skill") {
            // get skill tags
            types = types.concat(_getTags(html, "input#skill"));
            // get lore tags
            types = types.concat(_getTags(html, "input#lores").map(t => _prepareLoreType(t)));

            // get trait tags
            traits = traits.concat(_getTags(html, "input#traits"));
            // get action tags
            traits = traits.concat(_getTags(html, "input#actions").map(a => _prepareActionType(a)));

            if (!!html.querySelector("input#secret:checked") && !traits.includes("secret")) {
                traits.push("secret");
            }
        } else if (activeTab?.dataset.tab == "save") {
            types = _getTags(html, "input#save");
            if (!!html.querySelector("input#basic-save:checked")) extras.push("basic:true");
        }
    }

    if (types.length) {
        let flavor = "";
        const titleEl = html.querySelector("input#title");
        if (titleEl instanceof HTMLInputElement && titleEl.value) {
            flavor = `<h4 class="action"><strong>${titleEl.value}</strong></h4><hr>`
        }


        let dc = html.querySelector<HTMLInputElement>("input#dc")?.value;
        if (dc) {
            const dcAdjustment = (html.querySelector<HTMLInputElement>("select#adjust-difficulty"))?.value as DCAdjustment;
            if (dcAdjustment) dc = adjustDC(+dc, dcAdjustment).toString();
        }
        
        const content = types.map(type => _prepareCheck(type, dc, traits, extras)).join("");
        console.log(content);

        ChatMessage.create({
            user: game.user.id,
            flavor,
            content,
        });
    }
}

function _getTags(html: HTMLElement, selector: string): string[] {
    const el = html.querySelector(selector);
    const tagArray: TagifyValue[] = (el instanceof HTMLInputElement && el.value) 
        ? JSON.parse(el.value) 
        : [];
    return tagArray.map(tag => tag.id || tag.value);
};

function _prepareLoreType(type: string): string {
    return type.toLowerCase().replace("lore", "").trim().concat("-lore");
}

function _prepareActionType(type: string): string {
    return `action:${type.toLowerCase().replace("action:", "").trim()}`;
}

function _prepareCheck(type: string, dc: string | undefined, traits: string[], extras: string[]): string {
    const parts = [ 
        type, 
        (dc ? `dc:${dc}` : null), 
        (traits.length ? `traits:${traits.join(",")}` : null) 
    ].concat(...extras).filter(p => p);
    return `<p>@Check[${parts.join("|")}]</p>`;
}

interface TagifyValue {
    id: string,
    value: string
}
