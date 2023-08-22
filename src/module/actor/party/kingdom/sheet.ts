import { ActorPF2e, CreaturePF2e } from "@actor";
import { FeatGroup } from "@actor/character/feats.ts";
import { MODIFIER_TYPES } from "@actor/modifiers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { CampaignFeaturePF2e, ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { ValueAndMax } from "@module/data.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { SocketMessage } from "@scripts/socket.ts";
import { Statistic } from "@system/statistic/index.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    objectHasKey,
    setHasElement,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import { PartyPF2e } from "../document.ts";
import { KingdomBuilder } from "./builder.ts";
import { Kingdom } from "./model.ts";
import { KingdomAbilityData, KingdomData, KingdomLeadershipData, KingdomSource } from "./types.ts";
import {
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_COMMODITIES,
    KINGDOM_LEADERSHIP,
    KINGDOM_LEADERSHIP_ABILITIES,
    KINGDOM_RUIN_LABELS,
} from "./values.ts";

// Kingdom traits in order of when the phases occur in the process
const KINGDOM_TRAITS = ["commerce", "leadership", "region", "civic"];
type KingdomTrait = (typeof KINGDOM_TRAITS)[number];

class KingdomSheetPF2e extends ActorSheetPF2e<PartyPF2e> {
    protected selectedFilter: KingdomTrait | null = null;

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

        return {
            ...data,
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
                label: game.i18n.localize(`PF2E.Kingmaker.Kingdom.Commodity.${type}`),
                workSites: objectHasKey(kingdom.resources.workSites, type) ? kingdom.resources.workSites[type] : null,
            })),
            resourceDice: {
                ...kingdom.resources.dice,
                icon: fontAwesomeIcon(`dice-d${kingdom.resources.dice.faces}`).outerHTML,
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
                };
            }),
            actions: R.sortBy(kingdom.activities, (a) => a.name).map((item) => ({
                item,
                traits: createSheetTags(CONFIG.PF2E.kingmakerTraits, item.system.traits.value),
            })),
            skills: R.sortBy(Object.values(this.kingdom.skills), (s) => s.label),
            feats: [kingdom.features, kingdom.feats, kingdom.bonusFeats],
            actionFilterChoices: createSheetTags(CONFIG.PF2E.kingmakerTraits, KINGDOM_TRAITS),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Add open sheet links
        for (const openSheetLink of htmlQueryAll(html, "[data-action=open-sheet]")) {
            const actorUUID = htmlClosest(openSheetLink, "[data-actor-uuid]")?.dataset.actorUuid;
            const actor = fromUuidSync(actorUUID ?? "");
            openSheetLink.addEventListener("click", () => actor?.sheet.render(true));
        }

        for (const button of htmlQueryAll(html, "[data-action=builder]")) {
            button.addEventListener("click", () => {
                new KingdomBuilder(this.kingdom).render(true);
            });
        }

        const { fame } = this.kingdom.resources;
        const famePips = htmlQuery(html, "a[data-action=adjust-fame]");
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
            const role = leader.dataset.role;
            htmlQuery(leader, "[data-action=remove-leader]")?.addEventListener("click", () => {
                this.kingdom.update({ [`leadership.${role}`]: null });
            });
        }

        // Implement events for rollable statistics
        for (const rollableStat of htmlQueryAll(html, ".rollable")) {
            const statSlug = htmlClosest(rollableStat, "[data-statistic]")?.dataset.statistic;
            if (!statSlug) continue;

            rollableStat.addEventListener("click", (event) => {
                const statistic = this.actor.getStatistic(statSlug);
                statistic?.roll(eventToRollParams(event));
            });
        }

        htmlQuery(html, "[data-action=collect]")?.addEventListener("click", () => {
            this.kingdom.collect();
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
                    return ui.notifications.error("Type is required.");
                }

                this.kingdom.addCustomModifier(stat, { label, modifier, type });
            });
        }
    }

    protected filterActions(trait: string | null, options: { instant?: boolean } = {}): void {
        const html = this.element.get(0);
        const duration = 0.4;
        this.selectedFilter = trait;

        // Set and animate visibility of the different action types
        for (const action of this.kingdom.activities) {
            const element = htmlQuery(html, `[data-item-id="${action.id}"]`);
            const visible = !trait || tupleHasValue(action.system.traits.value, trait);
            if (!element) continue;

            if (options.instant) {
                element.hidden = !visible;
            } else if (visible && element.hidden) {
                gsap.fromTo(
                    element,
                    { height: 0, opacity: 0, hidden: false },
                    { height: "auto", opacity: 1, duration }
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
        }

        // Set active toggle
        for (const choice of htmlQueryAll(html, ".filters .choice")) {
            const active = choice.dataset.slug ? choice.dataset.slug === trait : trait === null;
            choice.classList.toggle("active", active);
        }
    }

    protected override async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasItemDataPF2e
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");

        // If the actor is the same, call the parent method, which will eventually call the sort instead
        if (this.actor.uuid === item.parent?.uuid) {
            return super._onDropItem(event, data);
        }

        if (item?.isOfType("campaignFeature") && (item.isFeat || item.isFeature)) {
            const featSlot = this.#getNearestFeatSlotId(event) ?? { categoryId: "bonus", slotId: null };
            const group = featSlot.categoryId === "bonus" ? this.kingdom.bonusFeats : this.kingdom.feats;
            return group.insertFeat(item, featSlot);
        }

        return super._onDropItem(event, data);
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(
        event: ElementDragEvent,
        itemSource: ItemSourcePF2e
    ): Promise<ItemPF2e<PartyPF2e>[]> {
        const item = this.actor.items.get(itemSource._id);
        if (item?.isOfType("campaignFeature") && (item.isFeat || item.isFeature)) {
            const featSlot = this.#getNearestFeatSlotId(event);
            if (!featSlot) return [];

            const group = featSlot.categoryId === "bonus" ? this.kingdom.bonusFeats : this.kingdom.feats;
            const resorting = item.group === group && !group?.slotted;
            if (group?.slotted && !featSlot.slotId) {
                return [];
            } else if (!resorting) {
                return group.insertFeat(item, featSlot);
            }
        }

        return super._onSortItem(event, itemSource);
    }

    protected override async _onDropActor(
        event: ElementDragEvent,
        data: DropCanvasData<"Actor", PartyPF2e>
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

    #getNearestFeatSlotId(event: ElementDragEvent) {
        const categoryId = event.target?.closest<HTMLElement>("[data-category-id]")?.dataset.categoryId;
        const slotId = event.target?.closest<HTMLElement>("[data-slot-id]")?.dataset.slotId;
        return typeof categoryId === "string" ? { slotId, categoryId } : null;
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
    resourceDice: KingdomData["resources"]["dice"] & { icon: string };
    leadership: LeaderSheetData[];
    actions: { item: CampaignFeaturePF2e; traits: SheetOptions }[];
    skills: Statistic[];
    feats: FeatGroup<PartyPF2e, CampaignFeaturePF2e>[];
    actionFilterChoices: SheetOptions;
}

interface LeaderSheetData extends KingdomLeadershipData {
    actor: ActorPF2e | null;
    img: string;
    slug: string;
    label: string;
    abilityLabel: string;
}

interface CommoditySheetData extends ValueAndMax {
    type: string;
    label: string;
    /** Worksite data (if it exists for the commodity type) */
    workSites: Kingdom["resources"]["workSites"]["ore"] | null;
}

export { KingdomSheetPF2e };
