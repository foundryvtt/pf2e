import type { BoostFlawState } from "@actor/character/apps/attribute-builder.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { SocketMessage } from "@scripts/socket.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, objectHasKey, tupleHasValue } from "@util";
import * as R from "remeda";
import type { PartyPF2e } from "../document.ts";
import { resolveKingdomBoosts } from "./helpers.ts";
import type { Kingdom } from "./model.ts";
import { KingdomCHG } from "./schema.ts";
import { KingdomSheetPF2e } from "./sheet.ts";
import type { KingdomAbility } from "./types.ts";
import {
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_SKILL_LABELS,
    KingdomCHGData,
    getKingdomCHGData,
} from "./values.ts";
import appv1 = foundry.appv1;

const KINGDOM_BUILD_CATEGORIES = ["charter", "heartland", "government"] as const;
const KINGDOM_BOOST_LEVELS = [1, 5, 10, 15, 20] as const;
type KingdomBuildCategory = (typeof KINGDOM_BUILD_CATEGORIES)[number];
type CurrentSelections = Record<KingdomBuildCategory, string | null>;

/** Dialog used to create and edit the charter, heartland, government, and ability scores  */
class KingdomBuilder extends appv1.api.FormApplication<Kingdom> {
    selected: CurrentSelections = {
        charter: null,
        heartland: null,
        government: null,
    };

    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["sheet", "kingdom-builder"],
            title: game.i18n.localize("PF2E.Kingmaker.KingdomBuilder.Title"),
            template: `${SYSTEM_ROOT}/templates/actors/party/kingdom/builder.hbs`,
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

    static showToPlayers(options: { uuid: string; tab?: string }): void {
        const users = game.users.filter((u) => !u.isSelf);
        game.socket.emit("system.pf2e", {
            request: "showSheet",
            users: users.map((u) => u.uuid),
            document: options.uuid,
            options: {
                campaign: "builder",
                tab: options.tab,
            },
        } satisfies SocketMessage);
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

    protected override _getHeaderButtons(): appv1.api.ApplicationV1HeaderButton[] {
        const buttons = super._getHeaderButtons();
        if (game.user.isGM) {
            buttons.unshift({
                label: "JOURNAL.ActionShow",
                class: "show-sheet",
                icon: "fa-solid fa-eye",
                onclick: () => {
                    KingdomBuilder.showToPlayers({ uuid: this.actor.uuid, tab: this._tabs[0].active });
                },
            });

            // Also add a cancel button for the gm if this is the building phase
            if (this.kingdom.active === "building") {
                buttons.unshift({
                    label: "PF2E.Kingmaker.KingdomBuilder.CancelCreation",
                    class: "cancel",
                    icon: "fa-solid fa-xmark",
                    onclick: () => {
                        this.kingdom.update({ active: false });
                    },
                });
            }
        }

        return buttons;
    }

    override async getData(): Promise<KingdomBuilderSheetData> {
        const database = getKingdomCHGData();

        // Returns the id of the active entry
        // The name check is there for backwards compatibility, we should migrate later.
        const getActiveForCategory = (category: KingdomBuildCategory) => {
            const active = this.kingdom.build[category];
            if (!active) return null;
            return (
                active?.id ??
                Object.entries(database[category]).find(([_, entry]) => entry?.name === active.name)?.[0] ??
                null
            );
        };

        // Preset selected for exact matches (if unset)
        for (const category of KINGDOM_BUILD_CATEGORIES) {
            this.selected[category] ??= getActiveForCategory(category);
        }

        const categories = await R.pipe(
            KINGDOM_BUILD_CATEGORIES,
            R.map(async (category: KingdomBuildCategory): Promise<[KingdomBuildCategory, CategorySheetData]> => {
                const selected = this.selected[category];
                const entries = database[category];
                const buildEntry = entries[selected ?? ""] ?? Object.values(entries)[0];
                const featItem = await (async () => {
                    try {
                        return buildEntry?.feat ? await fromUuid(buildEntry.feat) : null;
                    } catch (ex) {
                        console.error(ex);
                        return null;
                    }
                })();

                const savedEntry = this.kingdom.build[category];
                const result = {
                    selected,
                    active: getActiveForCategory(category),
                    buildEntry,
                    featLink: featItem ? await TextEditorPF2e.enrichHTML(featItem.link) : null,
                    stale:
                        !buildEntry || !savedEntry ? buildEntry !== savedEntry : !R.isDeepEqual(buildEntry, savedEntry),
                };
                return [category, result];
            }),
            (items) => Promise.all(items).then((result) => R.fromEntries(result)),
        );

        const { build } = this.kingdom;
        const finished = !!(build.charter && build.heartland && build.government);

        return {
            options: {
                editable: this.isEditable,
            },
            kingdom: this.kingdom,
            database,
            categories,
            abilityLabels: KINGDOM_ABILITY_LABELS,
            skillLabels: KINGDOM_SKILL_LABELS,
            build: this.#prepareAbilityBuilder(),
            finished,
            aspirationOptions: [
                { value: "fame", label: "PF2E.Kingmaker.Kingdom.Aspiration.fame" },
                { value: "infamy", label: "PF2E.Kingmaker.Kingdom.Aspiration.infamy" },
            ],
        };
    }

    #prepareAbilityBuilder(): KingdomAbilityBuilderData {
        function createButtons(): Record<KingdomAbility, BoostFlawState> {
            return Array.from(KINGDOM_ABILITIES).reduce(
                (accumulated, ability) => {
                    accumulated[ability] = { ability };
                    return accumulated;
                },
                {} as Record<KingdomAbility, BoostFlawState>,
            );
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

        // Implement callbacks for each build category
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

            const saveCategory = async (): Promise<void> => {
                const database = getKingdomCHGData();
                const id = this.selected[category] ?? "";
                const selected = database[category][id];
                if (selected) {
                    this.selected[category] = null;
                    await this.kingdom.update({
                        [`build.${category}`]: { id, ...selected },
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
                if (!object) return;

                const updated = current.includes(ability)
                    ? current.filter((a) => a !== ability)
                    : [...current, ability];
                const boosts = updated
                    .filter((a) => !object.boosts.includes(a) && object.flaw !== a)
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
        htmlQuery(html, "[data-action=complete]")?.addEventListener("click", async () => {
            this.close();
            await this.kingdom.update({ active: true });
            await this.kingdom.importActivities();
            new KingdomSheetPF2e(this.actor).render(true);
        });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<unknown> {
        if (!this.actor.id) return;
        return this.object.update(formData);
    }

    protected override async _render(force?: boolean, options?: KingdomBuilderRenderOptions): Promise<void> {
        // First check if this is active. If its not, it should close. This may occur if the GM cancels creation
        if (this.kingdom.active === false) {
            this.close({ force: true });
            return;
        }

        await super._render(force, options);
        this.kingdom.actor.apps[this.appId] ??= this;
        if (options?.tab) {
            this._tabs.at(0)?.activate(options.tab, { triggerCallback: true });
        }
    }
}

interface KingdomBuilder extends appv1.api.FormApplication<Kingdom> {
    render(force?: boolean, options?: KingdomBuilderRenderOptions): this;
}

interface KingdomBuilderRenderOptions extends appv1.api.AppV1RenderOptions {
    tab?: string | null;
}

interface KingdomBuilderSheetData {
    options: {
        editable: boolean;
    };
    kingdom: Kingdom;
    database: KingdomCHGData;
    categories: Record<KingdomBuildCategory, CategorySheetData>;
    abilityLabels: Record<string, string>;
    skillLabels: Record<string, string>;
    build: KingdomAbilityBuilderData;
    finished: boolean;
    aspirationOptions: FormSelectOption[];
}

interface CategorySheetData {
    /** The active build entry slug (the one that's been saved) */
    active: string | null;
    /** Selected refers to the one the user is viewing. Can be null for custom ones */
    selected: string | null;
    /** The build entry currently being viewed (aka selected) */
    buildEntry?: KingdomCHG;
    /** The feat item the selected build entry will grant */
    featLink: string | null;
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
