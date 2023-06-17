import * as R from "remeda";
import { htmlClosest, htmlQuery, htmlQueryAll, objectHasKey, tupleHasValue } from "@util";
import { PartyPF2e } from "../document.ts";
import { KINGDOM_ABILITIES, KINGDOM_ABILITY_LABELS, getKingdomABCData } from "./values.ts";
import { KingdomAbility, KingdomCHG } from "./data.ts";
import { Kingdom } from "./model.ts";
import { BoostFlawState } from "@actor/sheet/popups/ability-builder.ts";
import { resolveKingdomBoosts } from "./helpers.ts";

const KINGDOM_BUILD_CATEGORIES = ["charter", "heartland", "government"] as const;
const KINGDOM_BOOST_LEVELS = [1, 5, 10, 15, 20] as const;
type KingdomBuildCategory = (typeof KINGDOM_BUILD_CATEGORIES)[number];
type CurrentSelections = Record<KingdomBuildCategory, string | null>;

/** Dialog used to create and edit the charter, heartland, government, and ability scores  */
class KingdomBuilder extends FormApplication<Kingdom> {
    selected: CurrentSelections = {
        charter: null,
        heartland: null,
        government: null,
    };

    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["sheet", "kingdom-builder"],
            title: game.i18n.localize("PF2E.AbilityScoresHeader"),
            template: "systems/pf2e/templates/actors/party/kingdom/builder.hbs",
            width: 560,
            height: "auto",
            submitOnChange: true,
            closeOnSubmit: false,
            tabs: [
                {
                    navSelector: "form > nav",
                    contentSelector: ".container",
                    initial: "main",
                },
            ],
        };
    }

    constructor(kingdom: Kingdom) {
        super(kingdom);
        kingdom.actor.apps[this.appId] = this;
    }

    override get id(): string {
        return `kingdom-builder-${this.actor.id}`;
    }

    get kingdom(): Kingdom {
        return this.object;
    }

    get actor(): PartyPF2e {
        return this.object.actor;
    }

    override get isEditable(): boolean {
        return this.actor.isOwner;
    }

    override async getData(): Promise<KingdomBuilderSheetData> {
        const database = getKingdomABCData();

        // Preset selected for exact matches (if unset)
        for (const category of KINGDOM_BUILD_CATEGORIES) {
            if (this.selected[category]) continue;

            const active = this.kingdom.build[category];
            for (const [slug, entry] of Object.entries(database[category])) {
                if (R.equals(active, entry)) {
                    this.selected[category] = slug;
                    break;
                }
            }
        }

        const categories = KINGDOM_BUILD_CATEGORIES.reduce((result, category) => {
            const selected = this.selected[category];
            const entries = database[category];
            const active = (objectHasKey(entries, selected) ? entries[selected] : null) ?? Object.values(entries)[0];
            const stale = !R.equals(active, this.kingdom.build[category]);
            result[category] = { selected, active, stale };
            return result;
        }, {} as Record<KingdomBuildCategory, CategorySheetData>);

        const { build } = this.kingdom;
        const finished = !!(build.charter && build.heartland && build.government);

        return {
            options: {
                editable: this.isEditable,
            },
            kingdom: this.kingdom,
            database,
            categories,
            abilities: KINGDOM_ABILITY_LABELS,
            build: this.#prepareAbilityBuilder(),
            finished,
        };
    }

    #prepareAbilityBuilder(): KingdomAbilityBuilderData {
        function createButtons(): Record<KingdomAbility, BoostFlawState> {
            return Array.from(KINGDOM_ABILITIES).reduce((accumulated, ability) => {
                accumulated[ability] = { ability };
                return accumulated;
            }, {} as Record<KingdomAbility, BoostFlawState>);
        }

        const choices = this.kingdom.build.boosts;

        const mainBoosts = R.mapToObj(KINGDOM_BUILD_CATEGORIES, (prop) => {
            const buildItem = this.kingdom[prop];
            if (!buildItem) return [prop, null];

            const buttons = createButtons();
            const selectedChoices = objectHasKey(choices, prop) ? choices[prop] : [];
            const boosts = resolveKingdomBoosts(buildItem, selectedChoices);
            const remaining = Math.max(0, buildItem.boosts.length - boosts.length);
            for (const ability of KINGDOM_ABILITIES) {
                const selected = boosts.includes(ability);

                // Kingmaker doesn't allow boosting a stat that has a flaw
                if (ability === buildItem.flaw) {
                    buttons[ability].flaw = { selected: true, locked: true };
                } else if (selected || buildItem.boosts.includes("free")) {
                    buttons[ability].boost = {
                        selected,
                        locked: buildItem.boosts.includes(ability),
                        disabled: !selected && !remaining,
                    };
                }
            }

            return [prop, { buttons, remaining }];
        });

        const levelBoosts = R.mapToObj(KINGDOM_BOOST_LEVELS, (level) => {
            const eligible = this.kingdom.level >= level;

            const buttons = createButtons();
            const boosts = this.kingdom.build.boosts[level];
            const remaining = eligible ? Math.max(0, 2 - boosts.length) : 0;
            for (const ability of KINGDOM_ABILITIES) {
                const selected = boosts.includes(ability) && eligible;
                buttons[ability].boost = {
                    selected,
                    disabled: !selected && !remaining,
                };
            }

            return [level, { buttons, remaining, eligible }];
        });

        return { ...mainBoosts, levelBoosts };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const categoryEl of htmlQueryAll(html, "[data-category]")) {
            const category = categoryEl.dataset.category ?? null;
            if (!tupleHasValue(KINGDOM_BUILD_CATEGORIES, category)) continue;

            for (const choiceElement of htmlQueryAll(categoryEl, ".choice")) {
                choiceElement.addEventListener("click", (evt) => {
                    const slug = htmlClosest(evt.target, "[data-slug]")?.dataset.slug;
                    if (category && objectHasKey(this.selected, category)) {
                        this.selected[category] = slug ?? null;
                        this.render();
                    }
                });
            }

            htmlQuery(categoryEl, "[data-action=unset]")?.addEventListener("click", () => {
                this.selected[category] = null;
                this.render();
            });

            const saveCategory = async (): Promise<void> => {
                const database = getKingdomABCData();
                const selected = database[category][this.selected[category] ?? ""];
                if (selected) {
                    this.selected[category] = null;
                    await this.kingdom.update({
                        [`build.${category}`]: selected,
                        [`build.boosts.${category}`]: [],
                    });
                }
            };

            htmlQuery(categoryEl, "[data-action=set]")?.addEventListener("click", () => {
                saveCategory();
            });

            htmlQuery(categoryEl, "[data-action=save-and-continue]")?.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                await saveCategory();
                const activeTab = this._tabs[0].active as KingdomBuildCategory;
                const idx = KINGDOM_BUILD_CATEGORIES.indexOf(activeTab);
                const newTab = KINGDOM_BUILD_CATEGORIES[idx + 1] ?? "ability";
                this._tabs[0].activate(newTab, { triggerCallback: true });
            });
        }

        // Implement selecting boosts
        for (const button of htmlQueryAll(html, ".ability-builder [data-section] .boost")) {
            const sectionId = htmlClosest(button, "[data-section]")?.dataset.section;
            const ability = htmlClosest(button, "[data-ability]")?.dataset.ability;
            if (!tupleHasValue(KINGDOM_ABILITIES, ability) || !tupleHasValue(KINGDOM_BUILD_CATEGORIES, sectionId)) {
                continue;
            }

            button.addEventListener("click", () => {
                const object = this.kingdom[sectionId];
                const current = this.kingdom.build.boosts[sectionId];
                const maxBoosts = object?.boosts.length;

                const updated = current.includes(ability)
                    ? current.filter((a) => a !== ability)
                    : [...current, ability];
                const boosts = updated
                    .filter((a) => !object?.boosts.includes(a) && object?.flaw !== a)
                    .slice(0, maxBoosts);
                this.kingdom.update({ [`build.boosts.${sectionId}`]: boosts });
            });
        }

        // Implement leveling boosts
        for (const button of htmlQueryAll(html, ".ability-builder [data-level] .boost")) {
            const level = Number(htmlClosest(button, "[data-level]")?.dataset.level);
            const ability = htmlClosest(button, "[data-ability]")?.dataset.ability;
            if (!tupleHasValue(KINGDOM_ABILITIES, ability) || !tupleHasValue(KINGDOM_BOOST_LEVELS, level)) {
                continue;
            }

            button.addEventListener("click", () => {
                const current = this.kingdom.build.boosts[level];
                const updated = current.includes(ability)
                    ? current.filter((a) => a !== ability)
                    : [...current, ability];
                const boosts = updated.slice(0, 2);
                this.kingdom.update({ [`build.boosts.${level}`]: boosts });
            });
        }

        // When the complete button is pressed, the kingdom becomes activated, and the sheet accessible
        htmlQuery(html, "[data-action=complete]")?.addEventListener("click", () => {
            this.kingdom.update({ active: true });
            this.close();
        });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<unknown> {
        if (!this.actor.id) return;
        return this.object.update(formData);
    }
}

interface KingdomBuilderSheetData {
    options: {
        editable: boolean;
    };
    kingdom: Kingdom;
    database: ReturnType<typeof getKingdomABCData>;
    categories: Record<KingdomBuildCategory, CategorySheetData>;
    abilities: Record<string, string>;
    build: KingdomAbilityBuilderData;
    finished: boolean;
}

interface CategorySheetData {
    /** Selected refers to the one the user is viewing. Can be null for custom ones */
    selected: string | null;
    active?: KingdomCHG;
    stale: boolean;
}

interface KingdomAbilityBuilderData {
    charter: KingdomBoostFlawRow | null;
    heartland: KingdomBoostFlawRow | null;
    government: KingdomBoostFlawRow | null;
    levelBoosts: Record<number, KingdomLevelRow>;
}

interface KingdomBoostFlawRow {
    buttons: Record<KingdomAbility, BoostFlawState>;
    remaining: number;
}

interface KingdomLevelRow extends KingdomBoostFlawRow {
    eligible: boolean;
}

export { KingdomBuilder };
