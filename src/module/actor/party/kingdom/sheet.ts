import { ActorPF2e, CreaturePF2e, type PartyPF2e } from "@actor";
import { FeatGroup } from "@actor/character/feats.ts";
import { MODIFIER_TYPES } from "@actor/modifiers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { ItemPF2e, type CampaignFeaturePF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { ValueAndMax } from "@module/data.ts";
import { SheetOption, SheetOptions, createSheetTags, getAdjustment } from "@module/sheet/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { SocketMessage } from "@scripts/socket.ts";
import { Statistic } from "@system/statistic/index.ts";
import {
    ErrorPF2e,
    SORTABLE_DEFAULTS,
    createHTMLElement,
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    setHasElement,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import Sortable from "sortablejs";
import { KingdomBuilder } from "./builder.ts";
import { calculateKingdomCollectionData } from "./helpers.ts";
import { Kingdom } from "./model.ts";
import {
    KingdomAbilityData,
    KingdomData,
    KingdomLeadershipData,
    KingdomSettlementData,
    KingdomSource,
} from "./types.ts";
import {
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_COMMODITIES,
    KINGDOM_COMMODITY_LABELS,
    KINGDOM_LEADERSHIP,
    KINGDOM_LEADERSHIP_ABILITIES,
    KINGDOM_RUIN_LABELS,
    KINGDOM_SETTLEMENT_TYPE_DATA,
    KINGDOM_SETTLEMENT_TYPE_LABELS,
    KINGDOM_SKILL_LABELS,
} from "./values.ts";

// Kingdom traits in order of when the phases occur in the process
const KINGDOM_TRAITS = ["commerce", "leadership", "region", "civic", "army"] as const;

class KingdomSheetPF2e extends ActorSheetPF2e<PartyPF2e> {
    /** The current selected activity filter, which doubles as an active kingdom phase */
    protected selectedFilter: string | null = null;

    /** HTML element to focus on a re-render, such as when new elements are added */
    protected focusElement: string | null = null;

    #editingSettlements: Record<string, boolean> = {};

    constructor(actor: PartyPF2e, options?: Partial<ActorSheetOptions>) {
        super(actor, options);
    }

    get kingdom(): Kingdom {
        const campaign = this.actor.campaign;
        if (!(campaign instanceof Kingdom)) {
            this.close();
            throw ErrorPF2e("Only actors with kingdom data is supported");
        }

        return campaign;
    }

    override get title(): string {
        return this.kingdom.name;
    }

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;

        return {
            ...options,
            classes: [...options.classes, "kingdom"],
            width: 720,
            height: 620,
            template: "systems/pf2e/templates/actors/party/kingdom/sheet.hbs",
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

    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        if (game.user.isGM) {
            buttons.unshift({
                label: "JOURNAL.ActionShow",
                class: "show-sheet",
                icon: "fas fa-eye",
                onclick: () => {
                    const users = game.users.filter((u) => !u.isSelf);
                    game.socket.emit("system.pf2e", {
                        request: "showSheet",
                        users: users.map((u) => u.uuid),
                        document: this.actor.uuid,
                        options: {
                            campaign: true,
                            tab: this._tabs[0].active,
                        },
                    } satisfies SocketMessage);
                },
            });
        }

        return buttons;
    }

    override async getData(options?: ActorSheetOptions): Promise<KingdomSheetData> {
        const data = await super.getData(options);
        const kingdom = this.kingdom;

        const settlementEntries = R.pipe(
            Object.entries(this.kingdom.settlements),
            R.filter((entry): entry is [string, KingdomSettlementData] => !!entry[1]),
            R.sortBy((entry) => entry[1].sort),
        );

        return {
            ...data,
            actor: this.actor,
            kingdom: this.kingdom,
            nationTypeLabel: game.i18n.localize(`PF2E.Kingmaker.Kingdom.NationType.${kingdom.nationType}`),
            abilities: KINGDOM_ABILITIES.map((slug) => {
                return {
                    ...this.kingdom.abilities[slug],
                    slug,
                    label: game.i18n.localize(KINGDOM_ABILITY_LABELS[slug]),
                    ruinLabel: game.i18n.localize(KINGDOM_RUIN_LABELS[slug]),
                };
            }),
            commodities: KINGDOM_COMMODITIES.map((type) => ({
                ...kingdom.resources.commodities[type],
                type,
                label: game.i18n.localize(KINGDOM_COMMODITY_LABELS[type]),
                workSites: {
                    label: game.i18n.localize(`PF2E.Kingmaker.WorkSites.${type}.Name`),
                    description: game.i18n.localize(`PF2E.Kingmaker.WorkSites.${type}.Description`),
                    hasResource: ["lumber", "ore", "stone"].includes(type),
                    value: kingdom.resources.workSites[type].value,
                    resource: kingdom.resources.workSites[type].resource,
                },
            })),
            resourceDice: {
                ...kingdom.resources.dice,
                icon: fontAwesomeIcon(`dice-d${kingdom.resources.dice.faces}`).outerHTML,
                bonusAdjustment: getAdjustment(kingdom.resources.dice.bonus, kingdom._source.resources.dice.bonus)
                    .adjustmentClass,
                penaltyAdjustment: getAdjustment(kingdom.resources.dice.penalty, kingdom._source.resources.dice.penalty)
                    .adjustmentClass,
            },
            leadership: KINGDOM_LEADERSHIP.map((slug) => {
                const data = this.kingdom.leadership[slug];
                const document = fromUuidSync(data.uuid ?? "");
                const actor = document instanceof ActorPF2e ? document : null;
                return {
                    ...data,
                    slug,
                    label: game.i18n.localize(`PF2E.Kingmaker.Kingdom.LeadershipRole.${slug}`),
                    actor,
                    img: actor?.prototypeToken.texture.src ?? actor?.img ?? ActorPF2e.DEFAULT_ICON,
                    abilityLabel: game.i18n.localize(KINGDOM_ABILITY_LABELS[KINGDOM_LEADERSHIP_ABILITIES[slug]]),
                    penaltyLabel: game.i18n.localize(`PF2E.Kingmaker.Kingdom.VacancyPenalty.${slug}`),
                };
            }),
            actions: R.sortBy(kingdom.activities, (a) => a.name).map((item) => ({
                item,
                traits: createSheetTags(
                    CONFIG.PF2E.kingmakerTraits,
                    item.system.traits.value.filter((t) => t !== "downtime"),
                ),
            })),
            skills: R.sortBy(Object.values(this.kingdom.skills), (s) => s.label),
            feats: [kingdom.features, kingdom.feats, kingdom.bonusFeats],
            actionFilterChoices: KINGDOM_TRAITS.map((trait) => ({
                label: game.i18n.localize(CONFIG.PF2E.kingmakerTraits[trait]),
                value: trait,
                selected: false, // selected is handled without re-render
            })),
            settlements: await Promise.all(
                settlementEntries.map(async ([id, data]) => {
                    return this.#prepareSettlement(id, data!);
                }),
            ),
            eventText: await TextEditor.enrichHTML(kingdom.event.text, {
                async: true,
                rollData: this.actor.getRollData(),
            }),
            settlementTypes: KINGDOM_SETTLEMENT_TYPE_LABELS,
            abilityLabels: KINGDOM_ABILITY_LABELS,
            skillLabels: KINGDOM_SKILL_LABELS,
        };
    }

    async #prepareSettlement(id: string, settlement: KingdomSettlementData): Promise<SettlementSheetData> {
        const data = KINGDOM_SETTLEMENT_TYPE_DATA[settlement.type];

        const levelRange =
            data.level[1] === Infinity
                ? `${data.level[0]}+`
                : data.level[0] === data.level[1]
                ? String(data.level[0])
                : data.level.join("-");
        const populationRange = data.population[1] === Infinity ? `${data.population[0]}+` : data.population.join("-");

        return {
            ...settlement,
            id,
            description: await TextEditor.enrichHTML(settlement.description, {
                async: true,
                rollData: this.actor.getRollData(),
            }),
            editing: this.#editingSettlements[id] ?? false,
            blocks: data.blocks === Infinity ? "10+" : data.blocks,
            populationRange,
            levelRange,
            typeLabel: KINGDOM_SETTLEMENT_TYPE_LABELS[settlement.type],
            storage: KINGDOM_COMMODITIES.map((type) => ({
                type,
                value: settlement.storage[type],
                label: game.i18n.localize(KINGDOM_COMMODITY_LABELS[type]),
            })),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // If a settlement name needs to be focused (such as when a new list item is created), do so
        if (this.focusElement) {
            htmlQuery(html, this.focusElement)?.focus();
            this.focusElement = null;
        }

        // Add open sheet links
        for (const openSheetLink of htmlQueryAll(html, "[data-action=open-sheet]")) {
            const actorUUID = htmlClosest(openSheetLink, "[data-actor-uuid]")?.dataset.actorUuid;
            const actor = fromUuidSync(actorUUID ?? "");
            openSheetLink.addEventListener("click", () => actor?.sheet.render(true));
        }

        for (const button of htmlQueryAll(html, "[data-action=builder]")) {
            const tab = button.dataset.tab ?? null;
            button.addEventListener("click", () => {
                new KingdomBuilder(this.kingdom).render(true, { tab });
            });
        }

        // Controls for Fame/Infamy editing
        const { fame } = this.kingdom.resources;
        const famePips = htmlQuery(html, "[data-action=adjust-fame]");
        famePips?.addEventListener("click", async () => {
            const newValue = Math.min(fame.value + 1, fame.max);
            await this.kingdom.update({ "resources.fame.value": newValue });
        });
        famePips?.addEventListener("contextmenu", async (event) => {
            event.preventDefault();
            const newValue = Math.max(fame.value - 1, 0);
            await this.kingdom.update({ "resources.fame.value": newValue });
        });

        // Data binding for leader roles
        for (const leader of htmlQueryAll(html, ".leader[data-role]")) {
            const { role, uuid } = leader.dataset;
            htmlQuery(leader, "[data-action=remove-leader]")?.addEventListener("click", () => {
                this.kingdom.update({ [`leadership.${role}`]: null });
            });

            if (uuid) {
                for (const clickable of htmlQueryAll(leader, "[data-action=open-sheet]")) {
                    clickable.addEventListener("click", () => fromUuid(uuid).then((a) => a?.sheet.render(true)));
                }
            }

            const vacantEl = htmlQuery(leader, ".vacant[title]");
            if (vacantEl) {
                const lines = vacantEl.title.split(/;\s*/).map((l) => createHTMLElement("li", { children: [l] }));
                const content = createHTMLElement("ul", { children: lines });
                $(vacantEl).tooltipster({
                    content,
                    contentAsHTML: true,
                    side: "right",
                    theme: "crb-hover",
                });
            }
        }

        // Implement events for rollable statistics
        for (const rollableStat of htmlQueryAll(html, ".rollable")) {
            const statSlug = htmlClosest(rollableStat, "[data-statistic]")?.dataset.statistic;
            if (!statSlug) continue;

            rollableStat.addEventListener("click", (event) => {
                const statistic = this.actor.getStatistic(statSlug);
                statistic?.roll(eventToRollParams(event, { type: "check" }));
            });
        }

        htmlQuery(html, "[data-action=collect]")?.addEventListener("click", async () => {
            ChatMessagePF2e.create({
                speaker: {
                    ...ChatMessagePF2e.getSpeaker(this.actor),
                    alias: this.kingdom.name,
                },
                content: await renderTemplate("systems/pf2e/templates/actors/party/kingdom/collection.hbs", {
                    ...calculateKingdomCollectionData(this.kingdom),
                }),
            });
        });

        // Handle action filters
        this.filterActions(this.selectedFilter, { instant: true });
        htmlQuery(html, ".filters")?.addEventListener("click", (event) => {
            const filterButton = htmlClosest(event.target, ".choice");
            if (!filterButton) return;

            this.filterActions(filterButton.dataset.slug ?? null);
        });

        $html.find("[data-tooltip-content]").tooltipster({
            trigger: "click",
            arrow: false,
            contentAsHTML: true,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["right", "bottom"],
            theme: "crb-hover",
            minWidth: 120,
        });

        // Handle adding and inputting custom user submitted modifiers
        for (const customModifierEl of htmlQueryAll(html, ".modifiers-tooltip")) {
            const stat = customModifierEl.dataset.stat;
            if (!stat) continue;

            for (const removeButton of htmlQueryAll(customModifierEl, "[data-action=remove-modifier]")) {
                const slug = removeButton.dataset.slug ?? "";
                removeButton.addEventListener("click", () => {
                    this.kingdom.removeCustomModifier(stat, slug);
                });
            }

            const modifierValueEl = htmlQuery<HTMLInputElement>(customModifierEl, ".add-modifier input[type=number]");
            htmlQuery(customModifierEl, "[data-action=increment]")?.addEventListener("click", () => {
                modifierValueEl?.stepUp();
            });
            htmlQuery(customModifierEl, "[data-action=decrement]")?.addEventListener("click", () => {
                modifierValueEl?.stepDown();
            });

            htmlQuery(customModifierEl, "[data-action=create-custom-modifier]")?.addEventListener("click", () => {
                const modifier = modifierValueEl?.valueAsNumber || 1;
                const type = htmlQuery<HTMLSelectElement>(customModifierEl, ".add-modifier-type")?.value ?? "";
                const label =
                    htmlQuery<HTMLInputElement>(customModifierEl, ".add-modifier-name")?.value?.trim() ??
                    game.i18n.localize(`PF2E.ModifierType.${type}`);
                if (!setHasElement(MODIFIER_TYPES, type)) {
                    ui.notifications.error("Type is required.");
                    return;
                }

                this.kingdom.addCustomModifier(stat, { label, modifier, type });
            });
        }

        // Add settlement and individual settlement actions
        htmlQuery(html, "[data-action=add-settlement]")?.addEventListener("click", () => {
            const id = randomID(16);
            this.#editingSettlements[id] = true;
            this.focusElement = `[name="settlements.${id}.name"]`;
            this.kingdom.update({ [`settlements.${id}`]: {} });
        });
        for (const settlementElement of htmlQueryAll(html, ".settlement")) {
            this.#activateSettlementEvents(settlementElement);
        }

        for (const link of htmlQueryAll(html, "[data-action=browse-feats]")) {
            const maxLevel = Number(link.dataset.level) || this.kingdom.level;

            link.addEventListener("click", async () => {
                const compendiumTab = game.pf2e.compendiumBrowser.tabs.campaignFeature;
                const filter = await compendiumTab.getFilterData();

                // Configure level filters
                const levels = filter.sliders.level;
                levels.values.max = Math.min(maxLevel, levels.values.upperLimit);
                levels.isExpanded = levels.values.max !== levels.values.upperLimit;

                // Set category
                filter.checkboxes.category.options["kingdom-feat"].selected = true;
                filter.checkboxes.category.selected.push("kingdom-feat");
                filter.checkboxes.category.isExpanded = true;

                compendiumTab.open(filter);
            });
        }

        htmlQuery(html, "[data-action=random-event]")?.addEventListener("click", () => {
            const stat = new Statistic(this.actor, {
                slug: "random-event",
                label: "Random Kingdom Event",
                check: {
                    type: "flat-check",
                },
            });

            stat.roll({ dc: this.kingdom.event.dc });
        });

        htmlQuery(html, "[data-action=reset-event-dc]")?.addEventListener("click", () => {
            this.kingdom.update({ event: { dc: 16 } });
        });

        // Sort settlements
        const settlementList = htmlQuery(html, ".settlement-list");
        if (settlementList) {
            Sortable.create(settlementList, {
                ...SORTABLE_DEFAULTS,
                handle: ".drag-handle",
                onEnd: (event) => {
                    const settlements = this.kingdom.settlements as Record<string, KingdomSettlementData>;
                    const settlementsWithIds = Object.entries(settlements).map(([id, value]) => ({ id, ...value }));
                    const settlement = settlementsWithIds.find((s) => s.id === event.item.dataset.settlementId);
                    const newIndex = event.newDraggableIndex;
                    if (!settlement || newIndex === undefined) {
                        this.render();
                        return;
                    }

                    // Perform the resort and update
                    const siblings = R.sortBy(
                        settlementsWithIds.filter((s) => s !== settlement),
                        (s) => s.sort,
                    );
                    siblings.splice(newIndex, 0, settlement);
                    const updates = R.mapToObj.indexed(siblings, (s, index) => [`settlements.${s.id}.sort`, index]);
                    this.kingdom.update(updates);
                },
            });
        }
    }

    /** Activate sheet events for a signle settlement */
    #activateSettlementEvents(settlementElement: HTMLElement) {
        const id = settlementElement.dataset.settlementId ?? null;
        if (id === null) return;

        const rerenderSettlement = async () => {
            const settlement = this.kingdom.settlements[id];
            if (!settlement) return;

            const newHTML = await renderTemplate(
                "systems/pf2e/templates/actors/party/kingdom/partials/settlement.hbs",
                {
                    ...(await this.getData()),
                    settlement: await this.#prepareSettlement(id, settlement),
                },
            );

            // Create the new settlement and replace the current one. We'll also need to re-listen to it.
            // activateListeners() handles both rich text editing and expanding the item summary
            const newElement = createHTMLElement("div", { innerHTML: newHTML }).firstElementChild;
            if (newElement instanceof HTMLElement) {
                newElement.classList.toggle("expanded", settlementElement.classList.contains("expanded"));
                settlementElement.replaceWith(newElement);
                super.activateListeners($(newElement));
                this.#activateSettlementEvents(newElement);
                if (this.#editingSettlements[id] && !newElement.classList.contains("expanded")) {
                    this.itemRenderer.toggleSummary(newElement, { visible: true });
                }
            }
        };

        htmlQuery(settlementElement, "[data-action=edit-settlement]")?.addEventListener("click", () => {
            this.#editingSettlements[id] = true;
            rerenderSettlement();
        });
        htmlQuery(settlementElement, "[data-action=finish-settlement]")?.addEventListener("click", async () => {
            this.#editingSettlements[id] = false;
            await this.saveEditor(`settlements.${id}.description`);
            rerenderSettlement();
        });
        htmlQuery(settlementElement, "[data-action=delete-settlement]")?.addEventListener("click", async (event) => {
            const settlement = this.kingdom.settlements[id];
            if (!settlement) return;
            const result =
                event?.ctrlKey ||
                (await Dialog.confirm({
                    title: game.i18n.localize("PF2E.DeleteItemTitle"),
                    content: `<p>${game.i18n.format("PF2E.DeleteQuestion", { name: `"${settlement.name}"` })}</p>`,
                }));
            if (result) {
                this.kingdom.update({ [`settlements.-=${id}`]: null });
            }
        });
    }

    protected filterActions(trait: string | null, options: { instant?: boolean } = {}): void {
        const html = this.element.get(0);
        const duration = 0.4;
        this.selectedFilter = trait;

        const animateElement = (element: HTMLElement, visible: boolean) => {
            if (options.instant) {
                element.hidden = !visible;
            } else if (visible && element.hidden) {
                gsap.fromTo(
                    element,
                    { height: 0, opacity: 0, hidden: false },
                    { height: "auto", opacity: 1, duration },
                );
            } else if (!visible && !element.hidden) {
                gsap.to(element, {
                    height: 0,
                    duration,
                    opacity: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    margin: 0,
                    clearProps: "all",
                    onComplete: () => {
                        element.hidden = true;
                        this.itemRenderer.toggleSummary(element, { visible: false, instant: true });
                    },
                });
            }
        };

        // Set and animate visibility of the different action types
        for (const action of this.kingdom.activities) {
            const element = htmlQuery(html, `[data-item-id="${action.id}"]`);
            const visible = !trait || tupleHasValue(action.system.traits.value, trait);
            if (!element) continue;
            animateElement(element, visible);
        }

        // Set and animate phases
        for (const summary of htmlQueryAll(html, ".phase-summary")) {
            animateElement(summary, summary.dataset.phase === trait);
        }

        // Set active toggle
        for (const choice of htmlQueryAll(html, ".filters .choice")) {
            const active = choice.dataset.slug ? choice.dataset.slug === trait : trait === null;
            choice.classList.toggle("active", active);
        }

        // Scroll to top so that the Activity Phase summary is visible
        const actionsList = htmlQuery(html, ".actions-list");
        if (actionsList) {
            actionsList.scrollTop = 0;
        }
    }

    protected override async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasItemDataPF2e,
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");

        // If the actor is the same, call the parent method, which will eventually call the sort instead
        if (this.actor.uuid === item.parent?.uuid) {
            return super._onDropItem(event, data);
        }

        if (item?.isOfType("campaignFeature") && (item.isFeat || item.isFeature)) {
            const slotData = this.#getFeatSlotData(event) ?? { groupId: "bonus", slotId: null };
            const group = slotData.groupId === "bonus" ? this.kingdom.bonusFeats : this.kingdom.feats;
            return group.insertFeat(item, slotData.slotId);
        }

        return super._onDropItem(event, data);
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(
        event: ElementDragEvent,
        itemSource: ItemSourcePF2e,
    ): Promise<ItemPF2e<PartyPF2e>[]> {
        const item = this.actor.items.get(itemSource._id!);
        if (item?.isOfType("campaignFeature") && (item.isFeat || item.isFeature)) {
            const featSlot = this.#getFeatSlotData(event);
            if (!featSlot) return [];

            const group = featSlot.groupId === "bonus" ? this.kingdom.bonusFeats : this.kingdom.feats;
            const resorting = item.group === group && !group?.slotted;
            if (group?.slotted && !featSlot.slotId) {
                return [];
            } else if (!resorting) {
                return group.insertFeat(item, featSlot.slotId);
            }
        }

        return super._onSortItem(event, itemSource);
    }

    protected override async _onDropActor(
        event: ElementDragEvent,
        data: DropCanvasData<"Actor", PartyPF2e>,
    ): Promise<false | void> {
        await super._onDropActor(event, data);

        const actor = fromUuidSync(data.uuid as ActorUUID);
        const closestLeader = htmlClosest(event.target, ".leader[data-role]");
        if (actor instanceof CreaturePF2e && closestLeader) {
            const role = String(closestLeader.dataset.role);
            const uuid = actor.uuid;
            this.kingdom.update({ leadership: { [role]: { uuid } } });
        }
    }

    #getFeatSlotData(event: ElementDragEvent): { slotId: string | undefined; groupId: string } | null {
        const groupId = event.target?.closest<HTMLElement>("[data-category-id]")?.dataset.categoryId;
        const slotId = event.target?.closest<HTMLElement>("[data-slot-id]")?.dataset.slotId;
        return typeof groupId === "string" ? { slotId, groupId } : null;
    }

    /** Override to not auto-disable fields on a thing meant to be used by players */
    protected override _disableFields(form: HTMLElement): void {
        for (const gmOnlyField of htmlQueryAll(form, "input, textarea, [data-access=owner]")) {
            if (gmOnlyField instanceof HTMLTextAreaElement) {
                gmOnlyField.readOnly = true;
            } else if (gmOnlyField instanceof HTMLInputElement || gmOnlyField instanceof HTMLButtonElement) {
                gmOnlyField.disabled = true;
            }
        }
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        if (!this.actor.id) return;

        const data: DeepPartial<KingdomSource> = expandObject(formData);

        // Ensure penalties are all negative numbers
        for (const abilitySlug of KINGDOM_ABILITIES) {
            const ability = data.abilities?.[abilitySlug];

            if (ability?.penalty) {
                ability.penalty = -Math.abs(ability.penalty);
            }
        }

        return this.kingdom.update(data);
    }
}

interface KingdomSheetData extends ActorSheetDataPF2e<PartyPF2e> {
    kingdom: Kingdom;
    nationTypeLabel: string;
    abilities: (KingdomAbilityData & {
        slug: string;
        label: string;
        ruinLabel: string;
    })[];
    commodities: CommoditySheetData[];
    resourceDice: KingdomData["resources"]["dice"] & {
        icon: string;
        bonusAdjustment: string | null;
        penaltyAdjustment: string | null;
    };
    leadership: LeaderSheetData[];
    actions: { item: CampaignFeaturePF2e; traits: SheetOptions }[];
    skills: Statistic[];
    feats: FeatGroup<PartyPF2e, CampaignFeaturePF2e>[];
    actionFilterChoices: SheetOption[];
    settlements: SettlementSheetData[];
    eventText: string;

    settlementTypes: Record<string, string>;
    abilityLabels: Record<string, string>;
    skillLabels: Record<string, string>;
}

interface LeaderSheetData extends KingdomLeadershipData {
    actor: ActorPF2e | null;
    img: string;
    slug: string;
    label: string;
    abilityLabel: string;
    penaltyLabel: string;
}

interface CommoditySheetData extends ValueAndMax {
    type: string;
    label: string;
    /** Worksite data (if it exists for the commodity type) */
    workSites: {
        label: string;
        description: string;
        hasResource: boolean;
        value: number;
        resource?: number;
    };
}

type SettlementSheetData = Omit<KingdomSettlementData, "storage"> & {
    id: string;
    editing: boolean;
    blocks: number | string;
    levelRange: string;
    populationRange: string;
    typeLabel: string;
    storage: {
        type: string;
        label: string;
        value: number;
    }[];
};

export { KingdomSheetPF2e };
