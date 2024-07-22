import type { ActorPF2e } from "@actor";
import type { StrikeData } from "@actor/data/base.ts";
import type { InitiativeRollResult } from "@actor/initiative.ts";
import type { PhysicalItemPF2e } from "@item";
import { AbstractEffectPF2e, ItemPF2e, SpellPF2e } from "@item";
import type { ActionCategory, ActionTrait } from "@item/ability/types.ts";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import type { ActionType, ItemSourcePF2e } from "@item/base/data/index.ts";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables.ts";
import { isContainerCycle } from "@item/container/helpers.ts";
import { itemIsOfType } from "@item/helpers.ts";
import type { Coins } from "@item/physical/data.ts";
import { detachSubitem } from "@item/physical/helpers.ts";
import { DENOMINATIONS, PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { createSelfEffectMessage } from "@module/chat-message/helpers.ts";
import { createSheetTags, maintainFocusInRender } from "@module/sheet/helpers.ts";
import { eventToRollMode, eventToRollParams } from "@scripts/sheet-util.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { StatisticRollParameters } from "@system/statistic/statistic.ts";
import {
    BasicConstructorOptions,
    BasicSelectorOptions,
    LanguageSelector,
    SELECTABLE_TAG_FIELDS,
    SelectableTagField,
    SenseSelector,
    SpeedSelector,
    TAG_SELECTOR_TYPES,
    TagSelectorBasic,
    TagSelectorOptions,
    TagSelectorType,
} from "@system/tag-selector/index.ts";
import {
    ErrorPF2e,
    SORTABLE_BASE_OPTIONS,
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    objectHasKey,
    setHasElement,
    signedInteger,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import Sortable from "sortablejs";
import { ActorSizePF2e } from "../data/size.ts";
import type {
    ActorSheetDataPF2e,
    ActorSheetRenderOptionsPF2e,
    CoinageSummary,
    InventoryItem,
    SheetInventory,
} from "./data-types.ts";
import { createBulkPerLabel, onClickCreateSpell } from "./helpers.ts";
import { ItemSummaryRenderer } from "./item-summary-renderer.ts";
import { AddCoinsPopup } from "./popups/add-coins-popup.ts";
import { CastingItemCreateDialog } from "./popups/casting-item-create-dialog.ts";
import { IdentifyItemPopup } from "./popups/identify-popup.ts";
import { ItemTransferDialog } from "./popups/item-transfer-dialog.ts";
import { IWREditor } from "./popups/iwr-editor.ts";
import { RemoveCoinsPopup } from "./popups/remove-coins-popup.ts";

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
abstract class ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.dragDrop = [
            { dragSelector: "[data-foundry-list] [data-drag-handle]" },
            { dragSelector: "ul[data-loot] li[data-item-id]" },
            { dragSelector: ".item-list .item:not(.inventory-list *)" },
        ];
        return fu.mergeObject(options, {
            classes: ["default", "sheet", "actor"],
            scrollY: [".sheet-sidebar", ".tab.active", ".inventory-list"],
        });
    }

    constructor(actor: TActor, options?: Partial<ActorSheetOptions>) {
        super(actor, options);

        // On initial opening, adjust width according to `fontSize` setting
        const baseWidth = this.options.width;
        if (typeof baseWidth === "number") {
            const calculatedWidth = (baseWidth * game.settings.get("core", "fontSize")) / 5;
            this.position.width &&= Math.floor(Math.clamp(calculatedWidth, 0.75 * baseWidth, 1024));
        }
    }

    /** Implementation used to handle the toggling and rendering of item summaries */
    itemRenderer: ItemSummaryRenderer<TActor, ActorSheetPF2e<TActor>> = new ItemSummaryRenderer(this);

    /** Is this sheet one in which the actor is not owned by the user, but the user can still take and deposit items? */
    get isLootSheet(): boolean {
        return !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    override async getData(options: Partial<ActorSheetOptions> = this.options): Promise<ActorSheetDataPF2e<TActor>> {
        options.id ||= this.id;
        options.editable = this.isEditable;
        options.sheetConfig &&=
            Object.values(CONFIG.Actor.sheetClasses[this.actor.type]).filter((c) => c.canConfigure).length > 1;

        for (const item of [...this.actor.itemTypes.action, ...this.actor.itemTypes.feat]) {
            if (item.system.selfEffect) {
                item.system.selfEffect.img ??= fromUuidSync(item.system.selfEffect.uuid)?.img ?? null;
            }
        }

        // The Actor and its Items
        const actorData = this.actor.toObject(false);

        // Alphabetize displayed IWR
        const iwrKeys = ["immunities", "weaknesses", "resistances"] as const;
        const attributes: Record<(typeof iwrKeys)[number], { label: string }[]> = actorData.system.attributes;
        for (const key of iwrKeys) {
            attributes[key] = [...attributes[key]].sort((a, b) => a.label.localeCompare(b.label));
        }

        // Calculate financial and total wealth
        const coins = this.actor.inventory.coins;
        const totalCoinage = ActorSheetPF2e.coinsToSheetData(coins);
        const totalCoinageGold = (coins.copperValue / 100).toFixed(2);

        const totalWealth = this.actor.inventory.totalWealth;
        const totalWealthGold = (totalWealth.copperValue / 100).toFixed(2);

        const traitsMap = ((): Record<string, string> => {
            switch (this.actor.type) {
                case "hazard":
                    return CONFIG.PF2E.hazardTraits;
                case "vehicle":
                    return CONFIG.PF2E.vehicleTraits;
                default:
                    return CONFIG.PF2E.creatureTraits;
            }
        })();

        // Consolidate toggles from across domains and regroup by sheet placement
        const toggles = R.groupBy(
            Object.values(this.actor.synthetics.toggles).flatMap((domain) => Object.values(domain)),
            (t) => t.placement,
        );

        const sheetData: ActorSheetDataPF2e<TActor> = {
            actor: actorData,
            cssClass: this.actor.isOwner ? "editable" : "locked",
            data: actorData.system,
            document: this.actor,
            editable: this.isEditable,
            effects: [],
            enrichedContent: {},
            inventory: this.prepareInventory(),
            isLootSheet: this.isLootSheet,
            isTargetFlatFooted: !!this.actor.rollOptions.all["target:condition:off-guard"],
            items: actorData.items,
            limited: this.actor.limited,
            options,
            owner: this.actor.isOwner,
            title: this.title,
            toggles,
            totalCoinage,
            totalCoinageGold,
            totalWealth,
            totalWealthGold,
            traits: createSheetTags(traitsMap, { value: Array.from(this.actor.traits) }),
            user: { isGM: game.user.isGM },
            publicationLicenses: [
                { label: "PF2E.Publication.License.OGL", value: "OGL" },
                { label: "PF2E.Publication.License.ORC", value: "ORC" },
            ],
        };

        await this.prepareItems?.(sheetData);

        return sheetData;
    }

    protected prepareInventory(): SheetInventory {
        const sections: SheetInventory["sections"] = [
            {
                label: game.i18n.localize("PF2E.Actor.Inventory.Section.WeaponsAndShields"),
                types: ["weapon", "shield"],
                items: [],
            },
            { label: game.i18n.localize("TYPES.Item.armor"), types: ["armor"], items: [] },
            { label: game.i18n.localize("TYPES.Item.equipment"), types: ["equipment"], items: [] },
            {
                label: game.i18n.localize("PF2E.Item.Consumable.Plural"),
                types: ["consumable"],
                items: [],
            },
            { label: game.i18n.localize("TYPES.Item.treasure"), types: ["treasure"], items: [] },
            { label: game.i18n.localize("PF2E.Item.Container.Plural"), types: ["backpack"], items: [] },
        ];

        const actor = this.actor;
        for (const item of actor.inventory.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0))) {
            if (item.isInContainer) continue;
            sections.find((s) => s.types.includes(item.type))?.items.push(this.prepareInventoryItem(item));
        }

        return {
            sections,
            bulk: actor.inventory.bulk,
            showValueAlways: actor.isOfType("npc", "loot", "party"),
            showUnitBulkPrice: false,
            hasStowedWeapons:
                actor.itemTypes.weapon.some((i) => i.isStowed) || actor.itemTypes.shield.some((i) => i.isStowed),
            hasStowingContainers: actor.itemTypes.backpack.some((c) => c.system.stowing && !c.isInContainer),
            invested: actor.inventory.invested,
        };
    }

    protected prepareInventoryItem(item: PhysicalItemPF2e): InventoryItem {
        const editable = game.user.isGM || item.isIdentified;
        const heldItems = item.isOfType("backpack")
            ? item.contents.map((i) => this.prepareInventoryItem(i))
            : undefined;
        heldItems?.sort((a, b) => (a.item.sort || 0) - (b.item.sort || 0));

        const actor = this.actor;
        const actorSize = new ActorSizePF2e({ value: actor.size });
        const itemSize = new ActorSizePF2e({ value: item.size });
        const sizeDifference = itemSize.difference(actorSize, { smallIsMedium: true });

        return {
            item,
            canBeEquipped: !item.isStowed,
            hasCharges: item.isOfType("consumable") && item.system.uses.max > 0,
            heldItems,
            isContainer: item.isOfType("backpack"),
            isInvestable: false,
            isSellable: editable && item.isOfType("treasure") && !item.isCoinage,
            itemSize: sizeDifference !== 0 ? itemSize : null,
            unitBulk: actor.isOfType("loot") ? createBulkPerLabel(item) : null,
            hidden: false,
        };
    }

    protected static coinsToSheetData(coins: Coins): CoinageSummary {
        return DENOMINATIONS.reduce(
            (accumulated, d) => ({
                ...accumulated,
                [d]: { value: coins[d], label: CONFIG.PF2E.currencies[d] },
            }),
            {} as CoinageSummary,
        );
    }

    protected getStrikeFromDOM(button: HTMLElement, readyOnly = false): StrikeData | null {
        const actionIndex = Number(htmlClosest(button, "[data-action-index]")?.dataset.actionIndex ?? "NaN");
        const rootAction = this.actor.system.actions?.at(actionIndex) ?? null;
        const altUsage = tupleHasValue(["thrown", "melee"], button?.dataset.altUsage) ? button?.dataset.altUsage : null;

        const strike = altUsage
            ? rootAction?.altUsages?.find((s) => (altUsage === "thrown" ? s.item.isThrown : s.item.isMelee)) ?? null
            : rootAction;

        return strike?.ready || !readyOnly ? strike : null;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        this.activateClickListener(html);

        // Inventory drag & drop. This has to happen prior to the options.editable check to allow drag & drop on
        // limited permission sheets.
        const inventoryPanel = ((): HTMLElement | null => {
            const selector = this.actor.isOfType("loot") ? ".sheet-body" : ".tab[data-tab=inventory]";
            return htmlQuery(html, selector);
        })();
        this.#activateInventoryDragDrop(inventoryPanel);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Handlers for number inputs of properties subject to modification by AE-like rules elements
        const manualPropertyInputs = htmlQueryAll<HTMLInputElement | HTMLSelectElement>(
            html,
            "select[data-property],input[data-property]",
        );
        for (const input of manualPropertyInputs) {
            // Whether the value is a modifier and to be displayed with a sign
            const isModifier = input.classList.contains("modifier") || input.dataset.modifier !== undefined;
            // Whether the value is nullable: if so, allow the value to be cleared instead of coercing to a number
            const isNullable = "nullable" in input.dataset;

            input.addEventListener("focus", () => {
                const propertyPath = input.dataset.property ?? "";
                input.name = propertyPath;
                if (input instanceof HTMLInputElement) {
                    const savedValue = fu.getProperty(this.actor._source, propertyPath);
                    const baseValue = isNullable && savedValue === null ? null : Math.trunc(Number(savedValue) || 0);
                    input.value = (baseValue ?? "").toString();
                    if (input.type === "text" && input.dataset.dtype === "Number") {
                        input.type = "number";
                    }
                }
            });

            input.addEventListener("blur", () => {
                input.removeAttribute("name");
                const propertyPath = input.dataset.property ?? "";
                const preparedValue = fu.getProperty(this.actor, propertyPath);
                const currentValue = preparedValue === null && isNullable ? preparedValue : Number(preparedValue) || 0;
                const baseValue = Math.trunc(Number(fu.getProperty(this.actor._source, propertyPath)) || 0);
                const newValue = isNullable && input.value === "" ? null : Math.trunc(Number(input.value));
                if (input instanceof HTMLInputElement) {
                    if (input.type === "number" && input.dataset.dtype === "Number") {
                        input.type = "text";
                    }

                    if (baseValue === newValue) {
                        input.value =
                            newValue === null
                                ? ""
                                : isModifier
                                  ? signedInteger(currentValue || 0)
                                  : String(currentValue || 0);
                    }
                }
            });
        }

        // Set listener toggles and their suboptions
        for (const togglesSection of htmlQueryAll(html, "ul[data-option-toggles]")) {
            togglesSection.addEventListener("change", (event) => {
                const toggleRow = htmlClosest(event.target, "[data-item-id][data-domain][data-option]");
                const checkbox = htmlQuery<HTMLInputElement>(toggleRow, "input[data-action=toggle-roll-option]");
                const suboptionsSelect = htmlQuery<HTMLSelectElement>(toggleRow, "select[data-action=set-suboption");
                const { domain, option, itemId } = toggleRow?.dataset ?? {};
                const suboption = suboptionsSelect?.value ?? null;
                if (checkbox && domain && option) {
                    this.actor.toggleRollOption(domain, option, itemId ?? null, checkbox.checked, suboption);
                }
            });
        }

        // Strikes
        for (const strikeElem of htmlQueryAll(html, "ol.strikes-list > li[data-strike]")) {
            // Attack
            const attackSelectors = ".item-image[data-action=strike-attack], button[data-action=strike-attack]";
            for (const button of htmlQueryAll(strikeElem, attackSelectors)) {
                button.addEventListener("click", async (event) => {
                    if (!Array.isArray(this.actor.system.actions)) {
                        throw ErrorPF2e("Strikes are not supported on this actor");
                    }

                    const altUsage = tupleHasValue(["thrown", "melee"] as const, button.dataset.altUsage)
                        ? button.dataset.altUsage
                        : null;

                    const strike = this.getStrikeFromDOM(button, true);
                    const variantIndex = Number(button.dataset.variantIndex);
                    await strike?.variants[variantIndex]?.roll({ event, altUsage });
                });
            }

            // Damage
            const damageSelectors = "button[data-action=strike-damage], button[data-action=strike-critical]";
            for (const button of htmlQueryAll(strikeElem, damageSelectors)) {
                const strike = this.getStrikeFromDOM(button);
                const method = button.dataset.action === "strike-damage" ? "damage" : "critical";
                button.addEventListener("click", async (event) => {
                    await strike?.[method]?.({ event });
                });

                const altUsage = tupleHasValue(["thrown", "melee"], button.dataset.altUsage)
                    ? button.dataset.altUsage
                    : null;

                // Set damage-formula tooltips
                strike?.[method]?.({ getFormula: true, altUsage }).then((formula) => {
                    if (!formula) return;
                    button.dataset.tooltip = formula.toString();
                });
            }
        }

        // Tag selector
        for (const link of htmlQueryAll(html, ".tag-selector")) {
            link.addEventListener("click", () => this.openTagSelector(link));
        }

        // Decrease effect value
        for (const effectDecrement of htmlQueryAll(html, ".effects-list .decrement")) {
            effectDecrement.addEventListener("click", (event) => {
                const parent = htmlClosest(event.currentTarget, ".item");
                const effect = this.actor.items.get(parent?.dataset.itemId ?? "");
                if (effect instanceof AbstractEffectPF2e) {
                    effect.decrease();
                }
            });
        }

        // Increase effect value
        for (const effectIncrement of htmlQueryAll(html, ".effects-list .increment")) {
            effectIncrement.addEventListener("click", (event) => {
                const parent = htmlClosest(event.currentTarget, ".item");
                const effect = this.actor?.items.get(parent?.dataset.itemId ?? "");
                if (effect instanceof AbstractEffectPF2e) {
                    effect.increase();
                }
            });
        }

        // Select all text in an input field on focus
        for (const inputElem of htmlQueryAll<HTMLInputElement>(html, "input[type=text], input[type=number]")) {
            inputElem.addEventListener("focus", () => {
                inputElem.select();
            });
        }

        // Only allow digits & leading plus and minus signs for `data-allow-delta` inputs,
        // thus emulating input[type="number"]
        for (const deltaInput of htmlQueryAll<HTMLInputElement>(html, "input[data-allow-delta]")) {
            deltaInput.addEventListener("input", () => {
                const match = /[+-]?\d*/.exec(deltaInput.value)?.at(0);
                deltaInput.value = match ?? deltaInput.value;
            });
        }
    }

    /** Sheet-wide click listeners for elements selectable as `a[data-action]` */
    protected activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const inventoryItemFromDOM = (event: MouseEvent): PhysicalItemPF2e<TActor> => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const subitemId = htmlClosest(event.target, "[data-subitem-id]")?.dataset.subitemId;
            const parentItem = this.actor.inventory.get(itemId, { strict: true });
            return subitemId ? parentItem.subitems.get(subitemId, { strict: true }) : parentItem;
        };

        const handlers: SheetClickActionHandlers = {
            "browse-abilities": (_, anchor) => {
                this.#onClickBrowseAbilities(anchor);
            },
            "browse-equipment": (_, anchor) => {
                return this.#onClickBrowseEquipment(anchor);
            },
            "create-item": (_, anchor) => {
                this.#onClickCreateItem(anchor);
            },
            "edit-item": (event) => {
                const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
                const subitemId = htmlClosest(event.target, "[data-subitem-id]")?.dataset.subitemId;
                const item = this.actor.items.get(itemId, { strict: true });
                if (item.isOfType("physical") && subitemId) {
                    return item.subitems.get(subitemId, { strict: true }).sheet.render(true);
                }
                return item.sheet.render(true);
            },
            "effect-toggle-unidentified": (event): Promise<unknown> | void => {
                const effectId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
                const effect = this.actor.items.get(effectId, { strict: true });
                if (effect.isOfType("effect")) {
                    const isUnidentified = effect.system.unidentified;
                    return effect.update({ "system.unidentified": !isUnidentified });
                }
            },
            "delete-item": (event) => {
                const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
                const subitemId = htmlClosest(event.target, "[data-subitem-id]")?.dataset.subitemId;
                const item = this.actor.items.get(itemId, { strict: true });
                if (item.isOfType("physical") && subitemId) {
                    const subitem = item.subitems.get(subitemId, { strict: true });
                    return this.deleteItem(subitem, event);
                }
                return this.deleteItem(item, event);
            },
            "item-to-chat": (event, anchor): Promise<unknown> | void => {
                const actor = this.actor;
                const itemEl = htmlClosest(anchor, "[data-item-id]");
                const collectionId = itemEl?.dataset.entryId;
                const collection: Collection<ItemPF2e<TActor>> = collectionId
                    ? actor.spellcasting?.collections.get(collectionId, { strict: true }) ?? actor.items
                    : actor.items;

                const itemId = itemEl?.dataset.itemId;
                const item = collection.get(itemId, { strict: true });
                if (item.isOfType("spell")) {
                    const castRank = Number(itemEl?.dataset.castRank ?? NaN);
                    return item.toMessage(event, { data: { castRank } });
                } else if (item.isOfType("physical")) {
                    const subitemId = htmlClosest(event.target, "[data-subitem-id]")?.dataset.subitemId;
                    const actualItem = subitemId ? item.subitems.get(subitemId, { strict: true }) : item;
                    return actualItem.toMessage(event);
                }

                return item.toMessage(event);
            },
            "roll-check": (event, anchor) => {
                const statisticSlug = htmlClosest(anchor, "[data-statistic]")?.dataset.statistic ?? "";
                const statistic = this.actor.getStatistic(statisticSlug);
                const args: StatisticRollParameters = eventToRollParams(event, { type: "check" });
                if (anchor.dataset.secret !== undefined) {
                    args.rollMode = game.user.isGM ? "gmroll" : "blindroll";
                }
                return statistic?.roll(args);
            },
            "roll-initiative": (_, element): Promise<InitiativeRollResult | null> | void => {
                if (!element.classList.contains("disabled") && this.actor.initiative) {
                    return this.actor.initiative.roll(eventToRollParams(event, { type: "check" }));
                }
            },
            "show-image": () => {
                const actor = this.actor;
                const title = actor.token?.name ?? actor.prototypeToken?.name ?? actor.name;
                return new ImagePopout(actor.img, { title, uuid: actor.uuid }).render(true);
            },
            "toggle-summary": (_, anchor): Promise<void> | void => {
                const selectors = ["subitem-id", "item-id", "action-index"].map((s) => `[data-${s}]`).join(",");
                const element = htmlClosest(anchor, selectors) ?? htmlClosest(anchor, "li");
                if (element) return this.itemRenderer.toggleSummary(element);
            },
            "use-action": (event, anchor) => {
                const actionSlug = htmlClosest(anchor, "[data-action-slug]")?.dataset.actionSlug;
                if (actionSlug) {
                    const action = game.pf2e.actions[actionSlug ?? ""];
                    if (!action) {
                        throw ErrorPF2e(`Unexpecteed error retrieving action ${actionSlug}`);
                    }
                    return action({ event, actors: [this.actor] });
                }

                const itemId = htmlClosest(anchor, "[data-item-id]")?.dataset.itemId;
                const item = this.actor.items.get(itemId, { strict: true });
                if (item.isOfType("action", "feat")) {
                    return createSelfEffectMessage(item, eventToRollMode(event));
                }
            },
            // INVENTORY
            "add-coins": () => {
                return new AddCoinsPopup(this.actor).render(true);
            },
            "decrease-quantity": (event) => {
                const item = inventoryItemFromDOM(event);
                if (item.quantity > 0) {
                    const subtrahend = Math.min(item.quantity, event.ctrlKey ? 10 : event.shiftKey ? 5 : 1);
                    return item.update({ "system.quantity": item.quantity - subtrahend });
                }
                return;
            },
            "detach-subitem": (event) => {
                const subitem = inventoryItemFromDOM(event);
                return detachSubitem(subitem, event.ctrlKey);
            },
            "increase-quantity": (event) => {
                const item = inventoryItemFromDOM(event);
                const addend = event.ctrlKey ? 10 : event.shiftKey ? 5 : 1;
                return item.update({ "system.quantity": item.quantity + addend });
            },
            "remove-coins": () => {
                return new RemoveCoinsPopup(this.actor).render(true);
            },
            "repair-item": (event) => {
                const item = inventoryItemFromDOM(event);
                return game.pf2e.actions.repair({ event, item });
            },
            "sell-all-treasure": () => {
                return this.#onClickSellAllTreasure();
            },
            "sell-treasure": (event) => {
                const item = inventoryItemFromDOM(event);
                const sellItem = async (): Promise<void> => {
                    if (item?.isOfType("treasure") && !item.isCoinage) {
                        await item.delete();
                        await this.actor.inventory.addCoins(item.assetValue);
                    }
                };

                if (event.ctrlKey) return sellItem();

                const content = document.createElement("p");
                content.innerText = game.i18n.format("PF2E.SellItemQuestion", { item: item.name });
                return new Dialog({
                    title: game.i18n.localize("PF2E.SellItemConfirmHeader"),
                    content: content.outerHTML,
                    buttons: {
                        Yes: {
                            icon: fontAwesomeIcon("check").outerHTML,
                            label: game.i18n.localize("Yes"),
                            callback: sellItem,
                        },
                        cancel: {
                            icon: fontAwesomeIcon("times").outerHTML,
                            label: game.i18n.localize("Cancel"),
                        },
                    },
                    default: "Yes",
                }).render(true);
            },
            "toggle-container": (event) => {
                const item = inventoryItemFromDOM(event);
                if (!item.isOfType("backpack")) return;
                const isCollapsed = item.system.collapsed ?? false;
                return item.update({ "system.collapsed": !isCollapsed });
            },
            "toggle-identified": (event) => {
                const item = inventoryItemFromDOM(event);
                if (item.isIdentified) {
                    item.setIdentificationStatus("unidentified");
                } else {
                    new IdentifyItemPopup(item).render(true);
                }
            },
        };

        // IWR
        for (const listName of ["immunities", "weaknesses", "resistances"] as const) {
            handlers[`edit-${listName}`] = () => {
                return new IWREditor(this.actor, { category: listName }).render(true);
            };
        }

        const sheetHandler = async (event: MouseEvent): Promise<void> => {
            const actionTarget = htmlClosest(event.target, "a[data-action], button[data-action]");
            const handler = handlers[actionTarget?.dataset.action ?? ""];
            if (handler && actionTarget) {
                event.stopImmediatePropagation();
                // Temporarily remove the listener to ignore unintentional double clicks
                html.removeEventListener("click", sheetHandler);
                try {
                    await handler(event, actionTarget);
                } catch (error) {
                    console.error(error);
                } finally {
                    html.addEventListener("click", sheetHandler);
                }
            }
        };

        html.addEventListener("click", sheetHandler);

        return handlers;
    }

    /** Inventory drag & drop listeners */
    #activateInventoryDragDrop(panel: HTMLElement | null): void {
        const section = htmlQuery(panel, "section[data-inventory]");
        if (!section || !this.isEditable) return;

        for (const list of htmlQueryAll(section, "ul[data-item-list]")) {
            const options: Sortable.Options = {
                ...SORTABLE_BASE_OPTIONS,
                scroll: section,
                // Necessary for drag/drop to other sheets/tokens to work
                setData: (dataTransfer, dragEl) => {
                    const item = this.actor.inventory.get(dragEl.dataset.itemId, { strict: true });
                    dataTransfer.setData("text/plain", JSON.stringify({ ...item.toDragData(), fromInventory: true }));
                },
                onMove: (event) => this.#onMoveInventoryItem(event),
                onEnd: (event) => this.#onDropInventoryItem(event),
            };

            new Sortable(list, options);
        }
    }

    /** Handle dragging of items in the inventory */
    #onMoveInventoryItem(event: Sortable.MoveEvent): boolean | 1 {
        const isSeparateSheet = htmlClosest(event.target, "form") !== htmlClosest(event.related, "form");
        if (!this.isEditable || isSeparateSheet) return false;

        const sourceItem: PhysicalItemPF2e<ActorPF2e> | undefined = this.actor.inventory.get(
            event.dragged?.dataset.itemId,
            { strict: true },
        );

        const containerRowData = htmlQueryAll(this.form, "li[data-is-container] > .data");
        for (const row of containerRowData) {
            row.classList.remove("drop-highlight");
        }

        const targetSection = htmlClosest(event.related, "ul[data-item-types]")?.dataset.itemTypes?.split(",") ?? [];
        if (targetSection.length === 0) return false;
        if (targetSection.includes(sourceItem.type)) return true;

        if (targetSection.includes("backpack")) {
            const openContainerId = htmlClosest(event.related, "ul[data-container-id]")?.dataset.containerId ?? "";
            const openContainer: PhysicalItemPF2e<ActorPF2e> | undefined = this.actor.inventory.get(openContainerId);
            const targetItemRow = htmlClosest(event.related, "li[data-item-id]");
            const targetItem = this.actor.inventory.get(targetItemRow?.dataset.itemId ?? "");
            if (targetItem?.isOfType("backpack")) {
                if (isContainerCycle(sourceItem, targetItem)) return false;
                if (targetItemRow && !openContainer) {
                    htmlQuery(targetItemRow, ":scope > .data")?.classList.add("drop-highlight");
                    return false;
                }
            }

            return !!targetItem;
        }

        return false;
    }

    /** Handle drop of inventory items */
    async #onDropInventoryItem(event: Sortable.SortableEvent & { originalEvent?: DragEvent }): Promise<void> {
        const isSeparateSheet = htmlClosest(event.target, "form") !== htmlClosest(event.originalEvent?.target, "form");
        if (!this.isEditable || isSeparateSheet) return;

        const containerRowData = htmlQueryAll(this.form, "li[data-is-container] > .data");
        for (const row of containerRowData) {
            row.classList.remove("drop-highlight");
        }

        const inventory = this.actor.inventory;
        const sourceItem = inventory.get(event.item.dataset.itemId, { strict: true });
        const itemsInList = htmlQueryAll(htmlClosest(event.item, "ul"), ":scope > li").map((li) =>
            li.dataset.itemId === sourceItem.id ? sourceItem : inventory.get(li.dataset.itemId, { strict: true }),
        );

        const targetItemId = htmlClosest(event.originalEvent?.target, "li[data-item-id]")?.dataset.itemId ?? "";
        const targetItem = this.actor.inventory.get(targetItemId);

        // Determine if the "real" drop target is a stackable item
        const stackTarget = ((): PhysicalItemPF2e | null => {
            return targetItem?.isStackableWith(sourceItem) ? targetItem : null;
        })();
        if (stackTarget) return sourceItem.move({ toStack: stackTarget });

        // Update container if dropping into one
        const containerElem = htmlClosest(event.item, "ul[data-container-id]");
        const containerId = containerElem?.dataset.containerId ?? "";
        const container = targetItem?.isOfType("backpack") ? targetItem : inventory.get(containerId);
        if (container && !container.isOfType("backpack")) {
            throw ErrorPF2e("Unexpected non-container retrieved while sorting items");
        }

        if (container && isContainerCycle(sourceItem, container)) {
            this.render();
            return;
        }

        // Perform necessary re-sorting
        const sourceIndex = itemsInList.indexOf(sourceItem);
        const targetBefore = itemsInList[sourceIndex - 1];
        const targetAfter = itemsInList[sourceIndex + 1];
        const siblings = [...itemsInList];
        siblings.splice(siblings.indexOf(sourceItem), 1);
        type SortingUpdate = { _id: string; "system.containerId": string | null; sort?: number };
        const sortingUpdates: SortingUpdate[] = SortingHelpers.performIntegerSort(sourceItem, {
            siblings,
            target: targetBefore ?? targetAfter,
            sortBefore: !targetBefore,
        }).map((u) => ({ _id: u.target.id, "system.containerId": container?.id ?? null, sort: u.update.sort }));
        if (!sortingUpdates.some((u) => u._id === sourceItem.id)) {
            sortingUpdates.push({ _id: sourceItem.id, "system.containerId": container?.id ?? null });
        }

        await this.actor.updateEmbeddedDocuments("Item", sortingUpdates);
    }

    protected deleteItem<TItem extends ItemPF2e>(item: TItem, event?: MouseEvent): Promise<TItem | undefined> {
        return event?.ctrlKey ? item.delete() : item.deleteDialog();
    }

    #onClickBrowseAbilities(anchor: HTMLElement): void {
        const types = (anchor.dataset.actionType || "").split(",") as ActionType[];
        const traits = (anchor.dataset.actionTrait || "").split(",") as ActionTrait[];
        const categories = (anchor.dataset.actionCategory || "").split(",") as ActionCategory[];
        game.pf2e.compendiumBrowser.openActionTab({ types, traits, categories });
    }

    async #onClickBrowseEquipment(element: HTMLElement): Promise<void> {
        const checkboxesFilterCodes = (element.dataset.filter ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => !!s);
        const tab = game.pf2e.compendiumBrowser.tabs.equipment;
        const filter = await tab.getFilterData();
        const { checkboxes } = filter;

        for (const itemType of checkboxesFilterCodes) {
            const checkbox = checkboxes.itemTypes;
            if (objectHasKey(checkbox.options, itemType)) {
                checkbox.options[itemType].selected = true;
                checkbox.selected.push(itemType);
                checkbox.isExpanded = true;
            }
        }

        tab.open(filter);
    }

    protected override _canDragStart(selector: string): boolean {
        return this.isLootSheet || super._canDragStart(selector);
    }

    protected override _canDragDrop(selector: string): boolean {
        return this.isLootSheet || super._canDragDrop(selector);
    }

    /** Add support for dropping actions and toggles */
    protected override _onDragStart(event: DragEvent): void {
        if (!(event.target instanceof HTMLElement) || !event.dataTransfer) {
            return;
        }

        // Avoid intercepting content-link drag targets
        const isContentLink = event.target.dataset.link !== undefined && !!event.target.dataset.uuid;
        const isPersistent = "persistent" in event.target.dataset;
        if (event.target !== event.currentTarget && (isContentLink || isPersistent)) {
            return;
        }

        const targetElement = event.currentTarget;
        const previewElement = htmlClosest(targetElement, "[data-item-id], [data-item-uuid], [data-strike]");

        // Show a different drag/drop preview element and copy some data if this is a handle
        // This will make the preview nicer and also trick foundry into thinking the actual item started drag/drop
        if (previewElement && targetElement && targetElement !== previewElement) {
            const { x, y } = previewElement.getBoundingClientRect();
            event.dataTransfer.setDragImage(previewElement, event.pageX - x, event.pageY - y);
        }

        const itemId = previewElement?.dataset.itemId;
        const item = this.actor.items.get(itemId ?? "");

        const baseDragData: { [key: string]: unknown } = {
            actorId: this.actor.id,
            actorUUID: this.actor.uuid,
            sceneId: canvas.scene?.id ?? null,
            tokenId: this.actor.token?.id ?? null,
            ...item?.toDragData(),
        };
        if (previewElement && "isFormula" in previewElement.dataset) {
            baseDragData.isFormula = true;
            baseDragData.entrySelector = previewElement.dataset.entrySelector;
            baseDragData.uuid = previewElement.dataset.itemUuid;
        }

        // Dragging ...
        const supplementalData = (() => {
            const actionIndex = previewElement?.dataset.actionIndex;

            // ... an action (or melee item possibly to be treated as an action)?
            if (actionIndex) {
                return "itemType" in baseDragData && baseDragData.itemType === "melee"
                    ? { index: Number(actionIndex) }
                    : { type: "Action", index: Number(actionIndex) };
            }

            // ... an elemental blast
            const elementTrait = previewElement?.dataset.element;
            if (elementTrait) {
                return {
                    type: "Action",
                    elementTrait,
                };
            }

            // ... a roll-option toggle?
            const label = previewElement?.innerText.trim();
            const rollOptionData = previewElement?.dataset ?? {};
            if (item && label && rollOptionData.domain && rollOptionData.option) {
                return {
                    type: "RollOption",
                    label,
                    ...rollOptionData,
                };
            }

            // ... a crafting formula?
            if ("isFormula" in baseDragData) {
                return {
                    pf2e: {
                        type: "CraftingFormula",
                        itemUuid: itemId,
                    },
                };
            }

            // ... a spell?
            const collectionId = htmlClosest(previewElement, "[data-container-id]")?.dataset.containerId;
            const groupId = previewElement?.dataset.groupId;
            const slotIndex = Number(previewElement?.dataset.slotId);
            if (collectionId && groupId && Number.isInteger(slotIndex)) {
                return { spellFrom: { collectionId, groupId, slotIndex } };
            }

            // ... something else?
            return null;
        })();

        event.dataTransfer.setData("text/plain", JSON.stringify({ ...baseDragData, ...supplementalData }));
    }

    override async _onDrop(event: DragEvent): Promise<boolean | void> {
        const dropData = TextEditor.getDragEventData(event);
        if (this.actor && dropData.type === "PersistentDamage" && "formula" in dropData) {
            // Add persistent damage. If the actor type doesn't support conditions, it'll be rejected
            const roll = new DamageRoll(String(dropData.formula));
            if (roll.instances.length === 0 || roll.instances.some((i) => !i.persistent)) {
                throw ErrorPF2e("Unexpected error adding persistent damage: all instances must be persistent");
            }

            const baseConditionSource = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
            const conditions = roll.instances.map((i) =>
                fu.mergeObject(baseConditionSource, {
                    system: {
                        persistent: { formula: i.head.expression, damageType: i.type, dc: 15 },
                    },
                }),
            );
            await this.actor.createEmbeddedDocuments("Item", conditions);
        } else {
            return super._onDrop(event);
        }
    }

    protected override async _onDropItem(
        event: DragEvent,
        data: DropCanvasItemDataPF2e & { fromInventory?: boolean },
    ): Promise<ItemPF2e[]> {
        event.preventDefault();
        const item = await ItemPF2e.fromDropData(data);
        if (!item) return [];

        if (item.actor?.uuid === this.actor.uuid) {
            // Drops from inventory are handled by Sortable
            return data.fromInventory ? [] : this._onSortItem(event, item.toObject());
        }

        if (item.actor && item.isOfType("physical")) {
            await this.moveItemBetweenActors(event, item, this.actor);
            return [item];
        }

        return this._handleDroppedItem(event, item, data);
    }

    /**
     * Prevent a Foundry permission error from being thrown when a player moves an item from and to the sheet of the
     * same lootable actor.
     */
    protected override async _onSortItem(event: DragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        return this.actor.isOwner ? super._onSortItem(event, itemData) : [];
    }

    /**
     * PF2e specific method called by _onDropItem() when this is a new item that needs to be dropped into the actor
     * that isn't already on the actor or transferring to another actor.
     */
    protected async _handleDroppedItem(
        event: DragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: DropCanvasItemDataPF2e,
    ): Promise<ItemPF2e<ActorPF2e | null>[]>;
    protected async _handleDroppedItem(
        event: DragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: DropCanvasItemDataPF2e,
    ): Promise<Item<ActorPF2e | null>[]> {
        const actor = this.actor;
        const itemSource = item.toObject();

        // Set effect to unidentified if alt key is held
        const mystified = game.user.isGM && event.altKey;
        if (mystified && itemSource.type === "effect") {
            itemSource.system.unidentified = true;
        }

        // mystify the item if the alt key was pressed
        if (mystified && item.isOfType("physical") && itemIsOfType(itemSource, "physical")) {
            itemSource.system.identification.unidentified = item.getMystifiedData("unidentified");
            itemSource.system.identification.status = "unidentified";
        }

        // Get the item type of the drop target
        const containerAttribute = htmlClosest(event.target, ".item-container")?.dataset.containerType;
        const unspecificInventory = this._tabs[0]?.active === "inventory" && !containerAttribute;
        const dropContainerType = unspecificInventory ? "actorInventory" : containerAttribute;
        const craftingTab = this._tabs[0]?.active === "crafting";

        // Otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (item.isOfType("spell") && itemSource.type === "spell") {
            if (item.isRitual) {
                return this._onDropItemCreate(item.clone().toObject());
            } else if (dropContainerType === "actorInventory" && itemSource.system.level.value > 0) {
                const popup = new CastingItemCreateDialog(
                    actor,
                    {},
                    async (heightenedLevel, itemType, spell) => {
                        const createdItem = await createConsumableFromSpell(spell, {
                            type: itemType,
                            heightenedLevel,
                            mystified,
                        });
                        await this._onDropItemCreate(createdItem);
                    },
                    item,
                );
                popup.render(true);
                return [item];
            } else {
                return [];
            }
        } else if (itemSource.type === "spellcastingEntry") {
            // spellcastingEntry can only be created. drag & drop between actors not allowed
            return [];
        } else if (itemSource.type === "condition") {
            const value = data.value;
            if (typeof value === "number" && itemSource.system.value.isValued) {
                itemSource.system.value.value = value;
            }

            if (!actor.canUserModify(game.user, "update")) {
                ui.notifications.error("PF2E.ErrorMessage.NoUpdatePermission", { localize: true });
                return [];
            } else {
                const updated = await actor.increaseCondition(itemSource.system.slug, { value });
                return [updated ?? []].flat();
            }
        } else if (itemIsOfType(itemSource, "affliction", "effect")) {
            // Pass along level, badge-value, and traits to an effect dragged from a spell
            const { level, value, context } = data;
            if (typeof level === "number" && level >= 0) {
                itemSource.system.level.value = Math.floor(level);
            }
            if (
                itemSource.type === "effect" &&
                itemSource.system.badge?.type === "counter" &&
                typeof value === "number"
            ) {
                itemSource.system.badge.value = value;
            }
            itemSource.system.context = context ?? null;
            const originItem = fromUuidSync(context?.origin.item ?? "");
            if (itemSource.system.traits?.value.length === 0 && originItem instanceof SpellPF2e) {
                const spellTraits: string[] = originItem.system.traits.value;
                const effectTraits = spellTraits.filter((t): t is EffectTrait => t in CONFIG.PF2E.effectTraits);
                itemSource.system.traits.value.push(...effectTraits);
            }
        } else if (item.isOfType("physical") && actor.isOfType("character") && craftingTab) {
            const actorFormulas = fu.deepClone(actor.system.crafting.formulas);
            if (!actorFormulas.some((f) => f.uuid === item.uuid)) {
                actorFormulas.push({ uuid: item.uuid });
                await actor.update({ "system.crafting.formulas": actorFormulas });
            }
            return [item];
        }

        if (itemIsOfType(itemSource, "physical")) {
            const containerId = htmlClosest(event.target, "li[data-is-container]")?.dataset.itemId?.trim() || null;
            const container = this.actor.itemTypes.backpack.find((container) => container.id === containerId);
            if (container) {
                itemSource.system.containerId = containerId;
                itemSource.system.equipped.carryType = "stowed";
            } else {
                itemSource.system.equipped.carryType = "worn";
            }
            // If the item is from a compendium, adjust the size to be appropriate to the creature's
            if (data?.uuid?.startsWith("Compendium") && itemSource.type !== "treasure" && actor.isOfType("creature")) {
                const sourceSize = actor.system.traits?.naturalSize ?? actor.size;
                itemSource.system.size = sourceSize === "sm" ? "med" : sourceSize;
            }
        }

        // Creating a new item: clear the _id via cloning it
        return this._onDropItemCreate(new Item.implementation(itemSource).clone().toObject());
    }

    protected override async _onDropFolder(
        _event: DragEvent,
        data: DropCanvasData<"Folder", Folder>,
    ): Promise<ItemPF2e<TActor>[]>;
    protected override async _onDropFolder(
        _event: DragEvent,
        data: DropCanvasData<"Folder", Folder>,
    ): Promise<Item<TActor>[]> {
        if (!(this.actor.isOwner && data.documentName === "Item")) return [];
        const folder = (await Folder.fromDropData(data)) as Folder<ItemPF2e<null>> | undefined;
        if (!folder) return [];
        const itemSources = [folder, ...folder.getSubfolders()].flatMap((f) => f.contents).map((i) => i.toObject());
        return this._onDropItemCreate(itemSources);
    }

    /**
     * Update the aria-selected attribute on each tab after finishing the normal logic on tab change.
     */
    protected override _onChangeTab(event: MouseEvent, tabs: Tabs, active: string): void {
        super._onChangeTab(event, tabs, active);
        for (const tab of htmlQueryAll(tabs._nav, "[data-tab][role=tab]:not([aria-selected=undefined])")) {
            tab.setAttribute("aria-selected", String(tab.dataset.tab === active));
        }
    }

    /**
     * Moves an item between two actors' inventories.
     * @param event         Event that fired this method.
     * @param sourceActorId ID of the actor who originally owns the item.
     * @param targetActorId ID of the actor where the item will be stored.
     * @param itemId           ID of the item to move between the two actors.
     */
    async moveItemBetweenActors(event: DragEvent, item: PhysicalItemPF2e, targetActor: ActorPF2e): Promise<void> {
        const sourceActor = item.actor;
        if (!sourceActor || !targetActor) {
            throw ErrorPF2e("Unexpected missing actor(s)");
        }

        const containerId = htmlClosest(event.target, "[data-is-container]")?.dataset.containerId?.trim();
        const stackable = !!targetActor.inventory.findStackableItem(item._source);
        const isPurchase = sourceActor.isOfType("loot") && sourceActor.isMerchant;

        // If more than one item can be moved, show a popup to ask how many to move
        const result = await new ItemTransferDialog(item, {
            targetActor,
            lockStack: !stackable,
            isPurchase,
        }).resolve();

        if (result !== null) {
            sourceActor.transferItemToActor(
                targetActor,
                item as PhysicalItemPF2e<ActorPF2e>,
                result.quantity,
                containerId,
                result.newStack,
                result.isPurchase,
            );
        }
    }

    /** Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset */
    #onClickCreateItem(anchor: HTMLElement): void {
        const dataset = { ...anchor.dataset };
        const itemType = [dataset.type ?? dataset.types?.split(",")]
            .flat()
            .filter(R.isTruthy)
            .find((t) => t !== "shield");
        if (!objectHasKey(CONFIG.PF2E.Item.documentClasses, itemType)) {
            throw ErrorPF2e(`Unrecognized item type: types`);
        }

        if (itemType === "spell") {
            return onClickCreateSpell(this.actor, dataset);
        }

        const itemSource = ((): DeepPartial<ItemSourcePF2e> | null => {
            switch (itemType) {
                case "action": {
                    const { actionType } = dataset;
                    if (!objectHasKey(CONFIG.PF2E.actionTypes, actionType)) {
                        throw ErrorPF2e(`Action type not recognized: ${actionType}`);
                    }
                    const name = game.i18n.localize(`PF2E.ActionType${actionType.capitalize()}`);
                    return { type: itemType, name, system: { actionType: { value: actionType } } };
                }
                case "melee": {
                    const name = game.i18n.localize(`PF2E.NewPlaceholders.${itemType.capitalize()}`);
                    return { type: itemType, name };
                }
                case "lore": {
                    const name =
                        this.actor.type === "npc"
                            ? game.i18n.localize("PF2E.SkillLabel")
                            : game.i18n.localize("PF2E.NewPlaceholders.Lore");
                    return { type: itemType, name };
                }
                default: {
                    if (!setHasElement(PHYSICAL_ITEM_TYPES, itemType)) {
                        throw ErrorPF2e(`Unsupported item type: ${itemType}`);
                    }
                    const name = game.i18n.localize(`PF2E.NewPlaceholders.${itemType.capitalize()}`);
                    return { name, type: itemType };
                }
            }
        })();

        if (itemSource) {
            if (dataset.traits) {
                const traits = dataset.traits?.split(",") ?? [];
                itemSource.system = fu.mergeObject(itemSource.system ?? {}, { traits: { value: traits } });
            }

            this.actor.createEmbeddedDocuments("Item", [itemSource]);
        }
    }

    /** Render confirmation dialog to sell all treasure */
    async #onClickSellAllTreasure(): Promise<void> {
        const content = await renderTemplate("systems/pf2e/templates/actors/sell-all-treasure-dialog.hbs");

        new Dialog({
            title: game.i18n.localize("PF2E.SellAllTreasureTitle"),
            content,
            buttons: {
                yes: {
                    icon: fontAwesomeIcon("check").outerHTML,
                    label: "Yes",
                    callback: async () => this.actor.inventory.sellAllTreasure(),
                },
                cancel: {
                    icon: fontAwesomeIcon("times").outerHTML,
                    label: "Cancel",
                },
            },
            default: "cancel",
        }).render(true);
    }

    protected openTagSelector(anchor: HTMLElement, options: Partial<TagSelectorOptions> = {}): void {
        const selectorType = anchor.dataset.tagSelector;
        if (!tupleHasValue(TAG_SELECTOR_TYPES, selectorType)) {
            throw ErrorPF2e(`Unrecognized tag selector type "${selectorType}"`);
        }
        if (selectorType === "basic") {
            const objectProperty = anchor.dataset.property ?? "";
            const title = anchor.dataset.title ?? "";
            const configTypes = (anchor.dataset.configTypes ?? "")
                .split(",")
                .map((type) => type.trim())
                .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
            this.tagSelector("basic", {
                ...options,
                objectProperty,
                configTypes,
                title,
            });
        } else {
            this.tagSelector(selectorType, options);
        }
    }

    /** Construct and render a tag selection menu */
    protected tagSelector(selectorType: Exclude<TagSelectorType, "basic">, options?: Partial<TagSelectorOptions>): void;
    protected tagSelector(selectorType: "basic", options: BasicConstructorOptions): void;
    protected tagSelector(
        selectorType: TagSelectorType,
        options?: Partial<TagSelectorOptions> | BasicConstructorOptions,
    ): void {
        if (selectorType === "basic" && options?.objectProperty) {
            new TagSelectorBasic(this.object, options as BasicSelectorOptions).render(true);
        } else if (selectorType === "basic") {
            throw ErrorPF2e("Insufficient options provided to render basic tag selector");
        } else {
            const TagSelector = {
                languages: LanguageSelector,
                senses: SenseSelector,
                "speed-types": SpeedSelector,
            }[selectorType];
            new TagSelector(this.object, options).render(true);
        }
    }

    /** Opens a sheet tab by name. May be overriden to handle sub-tabs */
    protected openTab(name: string): void {
        this._tabs[0].activate(name);
    }

    /** Override of inner render function to maintain item summary state */
    protected override async _renderInner(data: Record<string, unknown>, options: RenderOptions): Promise<JQuery> {
        return this.itemRenderer.saveAndRestoreState(() => {
            return super._renderInner(data, options);
        });
    }

    /** Overriden _render to maintain focus on tagify elements */
    protected override async _render(force?: boolean, options?: ActorSheetRenderOptionsPF2e): Promise<void> {
        await maintainFocusInRender(this, () => super._render(force, options));
        if (options?.tab) {
            this.openTab(options.tab);
        }
    }

    protected override _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown> {
        const data = super._getSubmitData(updateData);

        // Use delta values for inputs that have `data-allow-delta` if input value starts with + or -
        for (const el of this.form.elements) {
            if (el instanceof HTMLInputElement && el.dataset.allowDelta !== undefined) {
                const strValue = el.value.trim();
                const value = Number(strValue);
                if ((strValue.startsWith("+") || strValue.startsWith("-")) && !Number.isNaN(value))
                    data[el.name] = Number(fu.getProperty(this.actor, el.name)) + value;
            }
        }

        return data;
    }

    protected override _configureProseMirrorPlugins(
        name: string,
        options: { remove?: boolean },
    ): Record<string, ProseMirror.Plugin> {
        const plugins = super._configureProseMirrorPlugins(name, options);
        plugins.menu = foundry.prosemirror.ProseMirrorMenu.build(foundry.prosemirror.defaultSchema, {
            destroyOnSave: options.remove,
            onSave: () => this.saveEditor(name, options),
            compact: true,
        });
        return plugins;
    }
}

interface ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    prepareItems?(sheetData: ActorSheetDataPF2e<TActor>): Promise<void>;
    render(force?: boolean, options?: ActorSheetRenderOptionsPF2e): this;
}

type SheetClickActionHandlers = Record<
    string,
    ((event: MouseEvent, actionTarget: HTMLElement) => Promise<void | unknown> | void | unknown) | undefined
>;

export { ActorSheetPF2e, type SheetClickActionHandlers };
