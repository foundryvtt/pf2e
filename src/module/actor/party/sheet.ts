import { ActorPF2e, CreaturePF2e } from "@actor";
import type { HitPointsSummary } from "@actor/base.ts";
import type { Language, ResourceData } from "@actor/creature/index.ts";
import { isReallyPC } from "@actor/helpers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import type { ActorSheetDataPF2e, ActorSheetRenderOptionsPF2e } from "@actor/sheet/data-types.ts";
import { condenseSenses } from "@actor/sheet/helpers.ts";
import { DistributeCoinsPopup } from "@actor/sheet/popups/distribute-coins-popup.ts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import type { DropCanvasData } from "@client/helpers/hooks.d.mts";
import type { ActorUUID } from "@common/documents/_module.d.mts";
import { ItemPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { Bulk } from "@item/physical/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import type { DropCanvasItemData } from "@module/canvas/drop-canvas-data.ts";
import type { ZeroToFour } from "@module/data.ts";
import { SheetOptions, createSheetTags, eventToRollParams } from "@module/sheet/helpers.ts";
import type { SocketMessage } from "@scripts/socket.ts";
import type { SettingsMenuOptions } from "@system/settings/menu.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { createHTMLElement, htmlClosest, htmlQuery, htmlQueryAll, signedInteger } from "@util";
import { createTooltipster } from "@util/destroyables.ts";
import * as R from "remeda";
import { PartyPF2e } from "./document.ts";
import appv1 = foundry.appv1;

interface PartySheetRenderOptions extends ActorSheetRenderOptionsPF2e {
    actors?: boolean;
}

class PartySheetPF2e extends ActorSheetPF2e<PartyPF2e> {
    currentSummaryView = "languages";

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;

        return {
            ...options,
            classes: [...options.classes, "party"],
            width: 720,
            height: 720,
            template: "systems/pf2e/templates/actors/party/sheet.hbs",
            scrollY: [...options.scrollY, ".tab.active", ".tab.active .content", ".sidebar"],
            tabs: [
                {
                    navSelector: "form > nav",
                    contentSelector: ".container",
                    initial: "main",
                },
            ],
        };
    }

    regionTemplates: Record<string, string> = {
        overview: "overview.hbs",
        inventoryMembers: "inventory-members.hbs",
        exploration: "exploration.hbs",
        explorationSidebar: "exploration-sidebar.hbs",
    };

    protected override _getHeaderButtons(): appv1.api.ApplicationV1HeaderButton[] {
        const buttons = super._getHeaderButtons();
        if (game.user.isGM) {
            buttons.unshift({
                label: "JOURNAL.ActionShow",
                class: "show-sheet",
                icon: "fa-solid fa-eye",
                onclick: () => {
                    const users = game.users.filter((u) => !u.isSelf);
                    game.socket.emit("system.pf2e", {
                        request: "showSheet",
                        users: users.map((u) => u.uuid),
                        document: this.actor.uuid,
                        options: {
                            tab: this._tabs[0].active,
                        },
                    } satisfies SocketMessage);
                },
            });
        }

        return buttons;
    }

    override async getData(options?: ActorSheetOptions): Promise<PartySheetData> {
        const base = await super.getData(options);
        const members = this.actor.members;
        const canDistributeCoins =
            game.user.isGM && this.isEditable
                ? { enabled: this.actor.inventory.coins.copperValue > 0 && members.some(isReallyPC) }
                : null;
        const travelSpeed = this.actor.system.movement.speeds.travel.value;
        const hexplorationActivities = Object.entries(CONFIG.PF2E.hexplorationActivities).map(([key, activities]) => ({
            speed: Number(key),
            activities,
        }));
        return {
            ...base,
            playerRestricted: !game.pf2e.settings.metagame.partyStats,
            restricted: !(game.user.isGM || game.pf2e.settings.metagame.partyStats),
            members: this.#prepareMembers(),
            overviewSummary: this.#prepareOverviewSummary(),
            inventorySummary: {
                totalCoins:
                    R.sumBy(members, (actor) => actor.inventory.coins.goldValue ?? 0) +
                    this.actor.inventory.coins.goldValue,
                totalWealth:
                    R.sumBy(members, (actor) => actor.inventory.totalWealth.goldValue ?? 0) +
                    this.actor.inventory.totalWealth.goldValue,
                totalBulk: members
                    .map((actor) => actor.inventory.bulk.value)
                    .reduce((a, b) => a.plus(b), this.actor.inventory.bulk.value),
            },
            canDistributeCoins,
            explorationSummary: {
                speed: travelSpeed,
                feetPerMinute: travelSpeed * 10,
                milesPerHour: travelSpeed / 10,
                milesPerDay: travelSpeed * 0.8,
                activities: hexplorationActivities.find((max) => max.speed >= travelSpeed)?.activities ?? 0,
            },
            orphaned: this.actor.items.filter((i) => !i.isOfType(...this.actor.allowedItemTypes)),
        };
    }

    #prepareMembers(): MemberBreakdown[] {
        return this.actor.members.map((actor): MemberBreakdown => {
            const observer = actor.testUserPermission(game.user, "OBSERVER");
            const restricted = !(game.pf2e.settings.metagame.partyStats || observer);
            const genderPronouns = actor.isOfType("character")
                ? actor.system.details.gender.value.trim() || null
                : null;
            const blurb =
                actor.isOfType("character") && actor.ancestry && actor.class
                    ? game.i18n.format("PF2E.Actor.Character.Blurb", {
                          level: actor.level,
                          ancestry: actor.ancestry.name,
                          class: actor.class.name,
                      })
                    : actor.isOfType("familiar") && actor.master
                      ? game.i18n.format("PF2E.Actor.Familiar.Blurb", { master: actor.master.name })
                      : actor.isOfType("npc")
                        ? actor.system.details.blurb.trim() || null
                        : null;
            const activities = actor.isOfType("character")
                ? actor.system.exploration.map((id) => actor.items.get(id)).filter(R.isTruthy)
                : [];

            const mythicPoints = actor.getResource("mythic-points");
            const heroPoints = isReallyPC(actor) ? actor.getResource("hero-points") : null;

            return {
                actor,
                hasBulk: actor.inventory.bulk.encumberedAfter !== Infinity,
                bestSkills: Object.values(actor.skills ?? {})
                    .filter((s) => s.proficient && !s.lore)
                    .sort((a, b) => b.mod - a.mod)
                    .slice(0, 4)
                    .map((s) => ({ slug: s.slug, mod: s.mod, label: s.label, rank: s.rank })),
                genderPronouns,
                blurb,
                resource: mythicPoints?.max ? mythicPoints : heroPoints,
                owner: actor.isOwner,
                observer,
                limited: observer || actor.limited,
                speeds: Object.values(actor.system.movement.speeds).filter(R.isNonNull),
                senses: (() => {
                    return condenseSenses(actor.perception.senses.contents).map((r) => ({
                        acuity: r.acuity,
                        labelFull: r.label ?? "",
                        label: CONFIG.PF2E.senses[r.type] ?? r.type,
                    }));
                })(),
                hp: actor.hitPoints,
                activities: activities.map((action) => ({
                    uuid: action.uuid,
                    name: action.name,
                    img: action.img,
                    traits: createSheetTags(CONFIG.PF2E.actionTraits, action.system.traits?.value ?? []),
                })),
                coins: actor.inventory.coins.goldValue,
                wealth: actor.inventory.totalWealth.goldValue,
                restricted,
            };
        });
    }

    #prepareOverviewSummary(): PartySheetData["overviewSummary"] | null {
        const members = this.actor.members;
        if (members.length === 0) return null;

        // Get all member languages. If the common language is taken, replace with "common" explicitly
        const commonLanguage = game.pf2e.settings.campaign.languages.commonLanguage;
        const allLanguages = new Set(members.flatMap((m) => m.system.details.languages?.value ?? []));
        if (commonLanguage && allLanguages.delete(commonLanguage)) {
            allLanguages.add("common");
        }

        const baseKnowledgeSkills = [
            "arcana",
            "nature",
            "occultism",
            "religion",
            "crafting",
            "society",
            "medicine",
        ] as const;

        const loreSkills = new Set(
            members
                .flatMap((m) => Object.values(m.skills))
                .filter((s) => s.lore)
                .map((s) => s.slug),
        );

        function getBestSkill(slug: string): SkillData | null {
            const bestMember = R.firstBy(members, [(m) => m.skills[slug]?.mod ?? -Infinity, "desc"]);
            const statistic = bestMember?.skills[slug];
            return statistic ? R.pick(statistic, ["slug", "mod", "label", "rank"]) : null;
        }

        return {
            languages: R.sortBy(
                [...allLanguages].map(
                    (language): LanguageSheetData => ({
                        slug: language,
                        label:
                            language === "common" && commonLanguage
                                ? game.i18n.format("PF2E.Actor.Creature.Language.CommonLanguage", {
                                      language: game.i18n.localize(CONFIG.PF2E.languages[commonLanguage]),
                                  })
                                : game.i18n.localize(CONFIG.PF2E.languages[language]),
                        actors: this.#getActorsThatUnderstand(language),
                    }),
                ),
                (l) => (l.slug === "common" ? "" : l.label),
            ),
            skills: R.sortBy(
                Object.entries(CONFIG.PF2E.skills).map(([slug, { label }]): SkillData => {
                    const best = getBestSkill(slug);
                    return best ?? { mod: 0, label, slug, rank: 0 };
                }),
                (s) => s.label,
            ),
            knowledge: {
                regular: baseKnowledgeSkills.map(getBestSkill).filter(R.isTruthy),
                lore: R.sortBy([...loreSkills].map(getBestSkill).filter(R.isTruthy), (s) => s.label),
            },
        };
    }

    #getActorsThatUnderstand(slug: Language) {
        return this.actor.members.filter((m): m is CreaturePF2e => !!m?.system.details.languages?.value.includes(slug));
    }

    protected setSummaryView(view: string): void {
        const summary = htmlQuery(this.element[0], "[data-tab=overview] .summary");
        if (!summary) return;

        const viewElements = htmlQueryAll(summary, "[data-view]:not([data-action=change-view])");
        for (const element of viewElements) {
            element.hidden = view !== element.dataset.view;
        }

        // Add active css classes to the buttons (for styling purposes only)
        for (const button of htmlQueryAll(summary, "[data-action=change-view]")) {
            button.classList.toggle("active", button.dataset.view === view);
        }

        this.currentSummaryView = view;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Show metagame option if clicked
        htmlQuery(html, "a[data-action=open-meta-setting]")?.addEventListener("click", () => {
            const menu = game.settings.menus.get("pf2e.metagame");
            if (menu) {
                const options: Partial<SettingsMenuOptions> = { highlightSetting: "showPartyStats" };
                const app = new menu.type(undefined, options);
                app.render(true);
            }
        });

        // Enable all roll actions
        for (const rollLink of htmlQueryAll(html, "[data-action=roll]")) {
            const actorUUID = htmlClosest(rollLink, "[data-actor-uuid]")?.dataset.actorUuid;
            const actor = fromUuidSync(actorUUID ?? "");
            if (!(actor instanceof ActorPF2e)) continue;

            rollLink.addEventListener("click", (event) => {
                const rollMode = rollLink.dataset.secret ? (game.user.isGM ? "gmroll" : "blindroll") : undefined;
                const statistic = actor.getStatistic(rollLink.dataset.statistic ?? "");
                statistic?.roll({ ...eventToRollParams(event, { type: "check" }), rollMode });
            });
        }

        // Add open actor sheet links
        for (const openSheetLink of htmlQueryAll(html, "[data-action=open-sheet]")) {
            const tab = openSheetLink.dataset.tab;
            const actorUUID = htmlClosest(openSheetLink, "[data-actor-uuid]")?.dataset.actorUuid;
            const actor = fromUuidSync(actorUUID ?? "");
            if (actor instanceof ActorPF2e) {
                openSheetLink.addEventListener("click", async () => actor.sheet.render(true, { tab }));
            }
        }

        // Control active overview summary
        this.setSummaryView(this.currentSummaryView);
        for (const button of htmlQueryAll(html, "[data-action=change-view]")) {
            button.addEventListener("click", () => {
                this.setSummaryView(button.dataset.view ?? "languages");
            });
        }

        // Add member specific events (such as hero point management)
        for (const memberElem of htmlQueryAll(html, "[data-actor-uuid]")) {
            const actorUUID = memberElem.dataset.actorUuid;
            const actor = this.document.members.find((m) => m.uuid === actorUUID);

            if (game.user.isGM) {
                htmlQuery(memberElem, "a[data-action=remove-member]")?.addEventListener("click", async (event) => {
                    const confirmed = event.ctrlKey
                        ? true
                        : await foundry.applications.api.DialogV2.confirm({
                              window: { title: "PF2E.Actor.Party.RemoveMember.Title" },
                              content: game.i18n.localize("PF2E.Actor.Party.RemoveMember.Content"),
                              yes: { default: true },
                          });
                    if (confirmed && actor) {
                        this.document.removeMembers(actor);
                    }
                });
            }

            if (actor?.canUserModify(game.user, "update")) {
                const pips = htmlQuery(memberElem, "a[data-action=adjust-member-resource]");
                const slug = pips?.dataset.resource ?? "";
                const resource = actor.getResource(slug);
                if (resource && pips) {
                    pips.addEventListener("click", async () => {
                        const newValue = Math.min(resource.value + 1, resource.max);
                        await actor.updateResource(slug, newValue);
                    });
                    pips.addEventListener("contextmenu", async (event) => {
                        event.preventDefault();
                        const newValue = Math.max(resource.value - 1, 0);
                        await actor.updateResource(slug, newValue);
                    });
                }
            }
        }

        // Mouseover tooltips to show actors that speak the language
        for (const languageTag of htmlQueryAll(html, "[data-language]")) {
            const slug = languageTag.dataset.language as Language;
            const actors = this.#getActorsThatUnderstand(slug);
            const members = actors.map((m) => m.name).join(", ");
            const titleLabel = game.i18n.localize("PF2E.Actor.Party.MembersLabel");
            const title = createHTMLElement("strong", { children: [titleLabel] });
            const content = createHTMLElement("span", { children: [title, members] });
            createTooltipster(languageTag, { content });
        }

        // Mouseover summary skill tooltips to show all actor modifiers
        for (const skillTag of htmlQueryAll(html, ".summary .skills [data-slug]")) {
            const slug = skillTag.dataset.slug ?? "";
            const statistics = this.actor.members.map((m) => m.skills[slug]).filter(R.isTruthy);
            const labels = R.sortBy(statistics, (s) => s.mod).map((statistic) => {
                const rank = statistic.rank ?? (statistic.proficient ? 1 : 0);
                const prof = game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank]);
                const label = `${statistic.actor.name} (${prof}) ${signedInteger(statistic.mod)}`;
                const row = createHTMLElement("div", { children: [label] });
                row.style.textAlign = "right";
                return row;
            });

            createTooltipster(skillTag, { content: createHTMLElement("div", { children: labels }) });
        }

        // Mouseover tooltip for exploration activities
        for (const activityElem of htmlQueryAll(html, ".activity[data-activity-uuid]")) {
            const document = fromUuidSync(activityElem.dataset.activityUuid ?? "");
            if (!(document instanceof ItemPF2e)) continue;

            const rollData = document.getRollData();
            (async () => {
                const content = createHTMLElement("div", {
                    classes: ["item-summary"],
                    innerHTML: await TextEditorPF2e.enrichHTML(document.description, { rollData }),
                });
                createTooltipster(activityElem, {
                    contentAsHTML: true,
                    content,
                    interactive: true,
                    maxWidth: 500,
                    side: "right",
                    theme: "crb-hover",
                });
            })();
        }

        htmlQuery(html, "button[data-action=distribute-coins]")?.addEventListener("click", () => {
            new DistributeCoinsPopup(this.actor, { recipients: this.actor.members }).render(true);
        });

        htmlQuery(html, "[data-action=clear-exploration]")?.addEventListener("click", async () => {
            await Promise.all(this.actor.members.map((m) => m.update({ "system.exploration": [] })));
            ui.notifications.info("PF2E.Actor.Party.ClearActivities.Complete", { localize: true });
        });

        htmlQuery(html, "[data-action=rest]")?.addEventListener("click", (event) => {
            game.pf2e.actions.restForTheNight({ event, actors: this.actor.members });
        });

        htmlQuery(html, "[data-action=prompt]")?.addEventListener("click", () => {
            game.pf2e.gm.checkPrompt({ actors: this.actor.members });
        });
    }

    /** Overriden to prevent inclusion of campaign-only item types. Those should get added to their own sheet */
    protected override async _onDropItemCreate(
        itemData: ItemSourcePF2e | ItemSourcePF2e[],
    ): Promise<Item<PartyPF2e>[]> {
        const toTest = Array.isArray(itemData) ? itemData : [itemData];
        const supported = [...PHYSICAL_ITEM_TYPES, ...this.actor.baseAllowedItemTypes];
        const invalid = toTest.filter((i) => !supported.includes(i.type));
        if (invalid.length) {
            for (const source of invalid) {
                const type = game.i18n.localize(CONFIG.Item.typeLabels[source.type] ?? source.type.titleCase());
                ui.notifications.error(game.i18n.format("PF2E.Item.CannotAddType", { type }));
            }
            return [];
        }

        return super._onDropItemCreate(itemData);
    }

    /** Override to allow divvying/outward transfer of items via party member blocks in inventory members sidebar. */
    protected override async _onDropItem(
        event: DragEvent,
        data: DropCanvasItemData & { fromInventory?: boolean },
    ): Promise<ItemPF2e[]> {
        const droppedRegion = htmlClosest(event.target, "[data-region]")?.dataset.region;
        const targetActorUUID = htmlClosest(event.target, "[data-actor-uuid]")?.dataset.actorUuid;
        if (droppedRegion === "inventoryMembers" && targetActorUUID) {
            const item = await ItemPF2e.fromDropData(data);
            const targetActor = await fromUuid(targetActorUUID);
            if (item?.isOfType("physical") && item.actor && targetActor instanceof ActorPF2e) {
                await this.moveItemBetweenActors(event, item, targetActor);
                return [item];
            } else if (!item) {
                return [];
            }
        }
        return super._onDropItem(event, data);
    }

    /** Override to not auto-disable fields on a thing meant to be used by players */
    protected override _disableFields(_form: HTMLElement): void {}

    /** Recursively performs a render and activation of all sub-regions */
    async #renderRegions(element: HTMLElement, data: object): Promise<void> {
        // Eventually this should cache results to compare if re-rendering
        for (const region of htmlQueryAll(element, "[data-region]")) {
            const regionId = region.dataset.region ?? "";
            const templateName = this.regionTemplates[regionId];
            if (!templateName) continue;

            const template = `systems/pf2e/templates/actors/party/regions/${templateName}`;
            const result = await fa.handlebars.renderTemplate(template, data);

            region.innerHTML = result;
            if (this._state !== appv1.api.Application.RENDER_STATES.RENDERING) {
                this.activateListeners($(region));
            }

            await this.#renderRegions(region, data);
        }
    }

    override render(force?: boolean, options?: PartySheetRenderOptions): this {
        if (options?.actors) {
            this.getData().then(async (data) => {
                this._saveScrollPositions(this.element);
                await this.#renderRegions(this.element[0], data);
                this._restoreScrollPositions(this.element);
            });
            return this;
        } else {
            return super.render(force, options);
        }
    }

    protected override async _renderInner(
        data: Record<string, unknown>,
        options: appv1.api.AppV1RenderOptions,
    ): Promise<JQuery<HTMLElement>> {
        const result = await super._renderInner(data, options);
        await this.#renderRegions(result[0], data);

        return result;
    }

    protected override async _onDropActor(
        event: DragEvent,
        data: DropCanvasData<"Actor", PartyPF2e>,
    ): Promise<false | void> {
        await super._onDropActor(event, data);

        const actor = fromUuidSync(data.uuid as ActorUUID);
        if (actor instanceof CreaturePF2e) {
            this.document.addMembers(actor);
        }
    }
}

interface PartySheetData extends ActorSheetDataPF2e<PartyPF2e> {
    /** Is the sheet restricted to players? */
    playerRestricted: boolean;
    /** Is the sheet restricted to the current user? */
    restricted: boolean;
    members: MemberBreakdown[];
    overviewSummary: {
        languages: LanguageSheetData[];
        skills: SkillData[];
        knowledge: {
            regular: SkillData[];
            lore: SkillData[];
        };
    } | null;
    inventorySummary: {
        totalCoins: number;
        totalWealth: number;
        totalBulk: Bulk;
    };
    explorationSummary: {
        speed: number;
        feetPerMinute: number;
        milesPerHour: number;
        milesPerDay: number;
        activities: number;
    };
    /** Unsupported items on the sheet, may occur due to disabled campaign data */
    orphaned: ItemPF2e[];
}

interface SkillData {
    slug: string;
    label: string;
    mod: number;
    rank?: ZeroToFour | null;
}

interface MemberBreakdown {
    actor: ActorPF2e;
    genderPronouns: string | null;
    blurb: string | null;
    resource: ResourceData | null;
    hasBulk: boolean;
    bestSkills: SkillData[];

    /** If the actor is owned by the current user */
    owner: boolean;
    /** If the actor has observer or greater permission */
    observer: boolean;
    /** If the actor has limited or greater permission */
    limited: boolean;

    speeds: { label: string; value: number }[];
    senses: { label: string | null; labelFull: string; acuity?: string }[];
    hp: HitPointsSummary;

    activities: {
        uuid: string;
        name: string;
        img: string;
        traits: SheetOptions;
    }[];

    coins: number;
    wealth: number;

    /** If true, the current user is restricted from seeing meta details */
    restricted: boolean;
}

interface LanguageSheetData {
    slug: string;
    label: string;
    actors: ActorPF2e[];
}

export { PartySheetPF2e, type PartySheetRenderOptions };
