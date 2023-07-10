import type { ActorPF2e } from "@actor";
import { CraftingFormula } from "@actor/character/crafting/index.ts";
import { StrikeData } from "@actor/data/base.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { AbstractEffectPF2e, ContainerPF2e, ItemPF2e, ItemProxyPF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables.ts";
import { ActionType } from "@item/data/base.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { Coins } from "@item/physical/data.ts";
import { DENOMINATIONS, PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { createSheetTags, maintainFocusInRender, processTagifyInSubmitData } from "@module/sheet/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import {
    BasicConstructorOptions,
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
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    isObject,
    objectHasKey,
    setHasElement,
    tupleHasValue,
} from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import Sortable, { type SortableEvent } from "sortablejs";
import { ActorSizePF2e } from "../data/size.ts";
import {
    ActorSheetDataPF2e,
    ActorSheetRenderOptionsPF2e,
    CoinageSummary,
    InventoryItem,
    SheetInventory,
} from "./data-types.ts";
import { onClickCreateSpell } from "./helpers.ts";
import { ItemSummaryRenderer } from "./item-summary-renderer.ts";
import { MoveLootPopup } from "./loot/move-loot-popup.ts";
import { AddCoinsPopup } from "./popups/add-coins-popup.ts";
import { CastingItemCreateDialog } from "./popups/casting-item-create-dialog.ts";
import { IdentifyItemPopup } from "./popups/identify-popup.ts";
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
        options.dragDrop.push({ dragSelector: ".drag-handle" }, { dragSelector: ".item[draggable=true]" });
        const itemDrag = options.dragDrop.find((d) => d.dragSelector === ".item-list .item");
        if (itemDrag) {
            // Inventory items are handled by Sortable
            itemDrag.dragSelector = ".item-list .item:not(.inventory-list *)";
        }
        return mergeObject(options, {
            classes: ["default", "sheet", "actor"],
            scrollY: [".sheet-sidebar", ".tab.active", ".inventory-list"],
        });
    }

    /** Implementation used to handle the toggling and rendering of item summaries */
    itemRenderer: ItemSummaryRenderer<TActor> = new ItemSummaryRenderer(this);

    /** Stores data from the Sortable onMove event */
    #sortableOnMoveData: { related?: HTMLElement; willInsertAfter?: boolean } = {};

    /** Can non-owning users loot items from this sheet? */
    get isLootSheet(): boolean {
        return false;
    }

    override async getData(options: ActorSheetOptions = this.options): Promise<ActorSheetDataPF2e<TActor>> {
        options.id ||= this.id;
        options.editable = this.isEditable;

        // The Actor and its Items
        const actorData = this.actor.toObject(false) as ActorPF2e;

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

        const sheetData: ActorSheetDataPF2e<TActor> = {
            cssClass: this.actor.isOwner ? "editable" : "locked",
            editable: this.isEditable,
            document: this.actor,
            limited: this.actor.limited,
            options,
            owner: this.actor.isOwner,
            title: this.title,
            actor: actorData,
            data: actorData.system,
            effects: [],
            items: actorData.items,
            user: { isGM: game.user.isGM },
            traits: createSheetTags(traitsMap, { value: Array.from(this.actor.traits) }),
            toggles: this.actor.synthetics.toggles,
            isTargetFlatFooted: !!this.actor.rollOptions.all["target:condition:flat-footed"],
            totalCoinage,
            totalCoinageGold,
            totalWealth,
            totalWealthGold,
            inventory: this.prepareInventory(),
            enrichedContent: {},
        };

        await this.prepareItems?.(sheetData);

        return sheetData;
    }

    protected prepareInventory(): SheetInventory {
        const sections: SheetInventory["sections"] = {
            weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), type: "weapon", items: [] },
            armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), type: "armor", items: [] },
            equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), type: "equipment", items: [] },
            consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), type: "consumable", items: [] },
            treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), type: "treasure", items: [] },
            backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), type: "backpack", items: [] },
        };

        const actorSize = new ActorSizePF2e({ value: this.actor.size });
        const createInventoryItem = (item: PhysicalItemPF2e<TActor>): InventoryItem => {
            const editable = game.user.isGM || item.isIdentified;
            const heldItems = item.isOfType("backpack") ? item.contents.map((i) => createInventoryItem(i)) : undefined;
            heldItems?.sort((a, b) => (a.item.sort || 0) - (b.item.sort || 0));

            const itemSize = new ActorSizePF2e({ value: item.size });
            const sizeDifference = itemSize.difference(actorSize, { smallIsMedium: true });

            const canBeEquipped = !item.isInContainer;

            return {
                item,
                itemSize: sizeDifference !== 0 ? itemSize : null,
                editable,
                isContainer: item.isOfType("backpack"),
                canBeEquipped,
                isInvestable:
                    this.actor.isOfType("character") && canBeEquipped && item.isIdentified && item.isInvested !== null,
                isSellable: editable && item.isOfType("treasure") && !item.isCoinage,
                hasCharges: item.isOfType("consumable") && item.uses.max > 0,
                heldItems,
            };
        };

        for (const item of this.actor.inventory.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0))) {
            if (!objectHasKey(sections, item.type) || item.isInContainer) continue;
            const category = item.isOfType("book") ? sections.equipment : sections[item.type];
            category.items.push(createInventoryItem(item));
        }

        return {
            sections,
            bulk: this.actor.inventory.bulk,
            showValueAlways: this.actor.isOfType("npc", "loot"),
            showIndividualPricing: this.actor.isOfType("loot"),
            hasStowingContainers: this.actor.itemTypes.backpack.some((c) => c.system.stowing && !c.isInContainer),
            invested: this.actor.inventory.invested,
        };
    }

    protected static coinsToSheetData(coins: Coins): CoinageSummary {
        return DENOMINATIONS.reduce(
            (accumulated, d) => ({
                ...accumulated,
                [d]: { value: coins[d], label: CONFIG.PF2E.currencies[d] },
            }),
            {} as CoinageSummary
        );
    }

    protected getStrikeFromDOM(target: HTMLElement): StrikeData | null {
        const actionIndex = Number(target.closest<HTMLElement>("[data-action-index]")?.dataset.actionIndex);
        const rootAction = this.actor.system.actions?.[actionIndex];
        if (!rootAction) return null;

        const altUsage = tupleHasValue(["thrown", "melee"] as const, target.dataset.altUsage)
            ? target.dataset.altUsage
            : null;

        return altUsage
            ? rootAction.altUsages?.find((s) => (altUsage === "thrown" ? s.item.isThrown : s.item.isMelee)) ?? null
            : rootAction;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0]!;

        // Item summaries
        this.itemRenderer.activateListeners(html);

        // Pop out window with actor portrait
        htmlQuery(html, "a[data-action=show-image]")?.addEventListener("click", () => {
            const actor = this.actor;
            const title = actor.token?.name ?? actor.prototypeToken?.name ?? actor.name;
            new ImagePopout(actor.img, { title, uuid: actor.uuid }).render(true);
        });

        // Inventory drag & drop. This has to happen prior to the options.editable check to allow drag & drop on limited permission sheets.
        const inventoryPanel = ((): HTMLElement | null => {
            const selector = this.actor.isOfType("loot") ? ".sheet-body" : ".tab[data-tab=inventory]";
            return htmlQuery(html, selector);
        })();
        if (this._canDragDrop(".item-list")) {
            this.#activateInventoryDragDrop(inventoryPanel);
        }

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Handlers for number inputs of properties subject to modification by AE-like rules elements
        const manualPropertyInputs = htmlQueryAll<HTMLInputElement | HTMLSelectElement>(
            html,
            "select[data-property],input[data-property]"
        );
        for (const input of manualPropertyInputs) {
            input.addEventListener("focus", () => {
                const propertyPath = input.dataset.property ?? "";
                input.name = propertyPath;
                if (input instanceof HTMLInputElement) {
                    const baseValue = Number(getProperty(this.actor._source, propertyPath));
                    input.value = String(baseValue);
                }
            });

            input.addEventListener("blur", () => {
                input.removeAttribute("name");
                const propertyPath = input.dataset.property ?? "";
                const preparedValue = getProperty(this.actor, propertyPath);
                if (input instanceof HTMLInputElement) {
                    const isPositiveModifier = input.classList.contains("modifier") && Number(preparedValue) >= 0;
                    input.value = isPositiveModifier ? `+${preparedValue}` : String(preparedValue);
                }
            });
        }

        // Delete Item
        for (const link of htmlQueryAll(html, ".item-delete")) {
            link.addEventListener("click", (event) => this.#onClickDeleteItem(event));
        }

        // Inventory
        this.#activateInventoryListeners(inventoryPanel);

        // Equipment Browser
        for (const link of htmlQueryAll(html, ".inventory-browse")) {
            link.addEventListener("click", () => this.#onClickBrowseEquipmentCompendia(link));
        }

        /* -------------------------------------------- */
        /*  Attributes, Skills, Saves and Traits        */
        /* -------------------------------------------- */

        // Roll saving throws
        for (const link of htmlQueryAll(html, ".save-name")) {
            link.addEventListener("click", (event) => {
                const saveType = htmlClosest(link, "[data-save]")?.dataset.save;
                if (!tupleHasValue(SAVE_TYPES, saveType)) {
                    throw ErrorPF2e(`"${saveType}" is not a recognized save type`);
                }

                this.actor.saves?.[saveType]?.check.roll(eventToRollParams(event));
            });
        }

        const rollInitElem = htmlQuery(html, ".roll-init");
        rollInitElem?.addEventListener("click", (event): void => {
            if (!rollInitElem.classList.contains("disabled") && this.actor.initiative) {
                this.actor.initiative.roll(eventToRollParams(event));
            }
        });

        // Set listener toggles and their suboptions
        const togglesArea = htmlQuery(html, ".actions-options");
        togglesArea?.addEventListener("change", (event) => {
            const toggleRow = htmlClosest(event.target, ".item[data-item-id]");
            const checkbox = htmlQuery<HTMLInputElement>(toggleRow, "input[data-action=toggle-roll-option]");
            const suboptionsSelect = htmlQuery<HTMLSelectElement>(toggleRow, "select[data-action=set-suboption");
            const { domain, option, itemId } = toggleRow?.dataset ?? {};
            const suboption = suboptionsSelect?.value ?? null;
            if (checkbox && domain && option) {
                this.actor.toggleRollOption(domain, option, itemId ?? null, checkbox.checked, suboption);
            }
        });

        // IWR
        for (const listName of ["immunities", "weaknesses", "resistances"] as const) {
            const editButton = htmlQuery(html, `a[data-action=edit-${listName}]`);
            editButton?.addEventListener("click", () => {
                new IWREditor(this.actor, { category: listName }).render(true);
            });
        }

        // Strikes
        const $strikesList = $html.find("ol.strikes-list");

        $strikesList.find("button[data-action=strike-damage]").on("click", async (event) => {
            await this.getStrikeFromDOM(event.currentTarget)?.damage?.({ event });
        });

        $strikesList.find("button[data-action=strike-critical]").on("click", async (event) => {
            await this.getStrikeFromDOM(event.currentTarget)?.critical?.({ event });
        });

        const attackSelectors = ".item-image[data-action=strike-attack], button[data-action=strike-attack]";
        $strikesList.find(attackSelectors).on("click", (event) => {
            if (!("actions" in this.actor.system)) {
                throw ErrorPF2e("Strikes are not supported on this actor");
            }

            const target = event.currentTarget;
            const altUsage = tupleHasValue(["thrown", "melee"] as const, target.dataset.altUsage)
                ? target.dataset.altUsage
                : null;

            const strike = this.getStrikeFromDOM(event.currentTarget);
            if (!strike) return;
            const $button = $(event.currentTarget);
            const variantIndex = Number($button.attr("data-variant-index"));

            strike.variants[variantIndex]?.roll({ event, altUsage });
        });

        // Set damage-formula tooltips on damage buttons
        const damageButtons = htmlQueryAll<HTMLButtonElement>(
            $strikesList[0],
            ["button[data-action=strike-damage]", "button[data-action=strike-critical]"].join(",")
        );
        for (const button of damageButtons) {
            const method = button.dataset.action === "strike-damage" ? "damage" : "critical";
            const altUsage = tupleHasValue(["thrown", "melee"] as const, button.dataset.altUsage)
                ? button.dataset.altUsage
                : null;

            const strike = this.getStrikeFromDOM(button);
            strike?.[method]?.({ getFormula: true, altUsage }).then((formula) => {
                if (!formula) return;
                button.title = formula.toString();
                $(button).tooltipster({ position: "top", theme: "crb-hover" });
            });
        }

        // Remove Spell Slot
        $html.find(".item-unprepare").on("click", (event) => {
            const slotLevel = Number($(event.currentTarget).parents(".item").attr("data-slot-level") ?? 0);
            const slotId = Number($(event.currentTarget).parents(".item").attr("data-slot-id") ?? 0);
            const entryId = $(event.currentTarget).parents(".item").attr("data-entry-id") ?? "";
            const collection = this.actor.spellcasting.collections.get(entryId);
            collection?.unprepareSpell(slotLevel, slotId);
        });

        // Set Expended Status of Spell Slot
        $html.find(".item-toggle-prepare").on("click", (event) => {
            const slotLevel = Number($(event.currentTarget).parents(".item").attr("data-slot-level") ?? 0);
            const slotId = Number($(event.currentTarget).parents(".item").attr("data-slot-id") ?? 0);
            const entryId = $(event.currentTarget).parents(".item").attr("data-entry-id") ?? "";
            const expendedState = ((): boolean => {
                const expendedString = $(event.currentTarget).parents(".item").attr("data-expended-state") ?? "";
                return expendedString !== "true";
            })();
            const collection = this.actor.spellcasting.collections.get(entryId);
            collection?.setSlotExpendedState(slotLevel, slotId, expendedState);
        });

        // Trait Selector
        for (const link of htmlQueryAll(html, ".tag-selector")) {
            link.addEventListener("click", () => this.openTagSelector(link));
        }

        // Create a custom item
        for (const link of htmlQueryAll(html, ".item-create, .item-control.spell-create")) {
            link.addEventListener("click", () => this.#onClickCreateItem(link));
        }

        // Update an embedded item
        $html.find(".item-edit").on("click", (event) => {
            const itemId = $(event.currentTarget).closest("[data-item-id]").attr("data-item-id");
            const item = this.actor.items.get(itemId ?? "");
            item?.sheet.render(true, { focus: true });
        });

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

        // Change whether an effect is secret to players or not
        for (const element of htmlQueryAll(html, ".effects-list [data-action=effect-toggle-unidentified]") ?? []) {
            element.addEventListener("click", async (event) => {
                const effectId = htmlClosest(event.currentTarget, "[data-item-id]")?.dataset.itemId;
                const effect = this.actor.items.get(effectId, { strict: true });
                if (effect.isOfType("effect")) {
                    const isUnidentified = effect.system.unidentified;
                    await effect.update({ "system.unidentified": !isUnidentified });
                }
            });
        }

        // Item chat cards
        for (const element of htmlQueryAll(html, ".item[data-item-id] .item-image, .item[data-item-id] .item-chat")) {
            element.addEventListener("click", async (event) => {
                const itemId = htmlClosest(element, "[data-item-id]")?.dataset.itemId ?? "";
                const [item, fromFormula] = (() => {
                    // Handle formula UUIDs
                    if (UUIDUtils.isItemUUID(itemId)) {
                        if ("knownFormulas" in this && isObject<Record<string, CraftingFormula>>(this.knownFormulas)) {
                            const formula = this.knownFormulas[itemId] as CraftingFormula;
                            if (formula) {
                                return [new ItemProxyPF2e(formula.item.toObject(), { parent: this.actor }), true];
                            }
                        }
                        throw ErrorPF2e(`Invalid UUID [${itemId}]!`);
                    }
                    return [this.actor.items.get(itemId, { strict: true }), false];
                })();

                if (!item.isOfType("physical") || item.isIdentified) {
                    await item.toMessage(event, { create: true, data: { fromFormula } });
                }
            });
        }

        // Modify select element
        $html.find<HTMLSelectElement>(".ability-select").on("change", async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            await this.actor.updateEmbeddedDocuments("Item", [
                {
                    _id: itemId,
                    "system.ability.value": event.target.value,
                },
            ]);
        });

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

    /** DOM listeners for inventory panel */
    #activateInventoryListeners(panel: HTMLElement | null): void {
        // Links and buttons
        panel?.addEventListener("click", (event) => {
            const link = htmlClosest(event.target, "a[data-action], button[data-action]");
            if (!link) return;
            const getItem = (): PhysicalItemPF2e<ActorPF2e> => {
                const itemId = htmlClosest(link, ".item")?.dataset.itemId ?? "";
                const item = this.actor.items.get(itemId);
                if (!item?.isOfType("physical")) throw ErrorPF2e("Item not found or isn't physical");
                return item;
            };

            switch (link.dataset.action) {
                case "add-coins": {
                    new AddCoinsPopup(this.actor).render(true);
                    return;
                }
                case "remove-coins": {
                    new RemoveCoinsPopup(this.actor).render(true);
                    return;
                }
                case "increase-quantity": {
                    const item = getItem();
                    const addend = event.ctrlKey ? 10 : event.shiftKey ? 5 : 1;
                    item.update({ "system.quantity": item.quantity + addend });
                    return;
                }
                case "decrease-quantity": {
                    const item = getItem();
                    if (item.quantity > 0) {
                        const subtrahend = Math.min(item.quantity, event.ctrlKey ? 10 : event.shiftKey ? 5 : 1);
                        item.update({ "system.quantity": item.quantity - subtrahend });
                    }
                    return;
                }
                case "repair": {
                    const item = getItem();
                    game.pf2e.actions.repair({ event, item });
                    return;
                }
                case "toggle-identified": {
                    const item = getItem();
                    if (item.isIdentified) {
                        item.setIdentificationStatus("unidentified");
                    } else {
                        new IdentifyItemPopup(item).render(true);
                    }
                    return;
                }
                case "toggle-container": {
                    const item = getItem();
                    if (!item.isOfType("backpack")) return;

                    const isCollapsed = item.system.collapsed ?? false;
                    item.update({ "system.collapsed": !isCollapsed });
                    return;
                }
                case "sell-treasure": {
                    const item = getItem();
                    const sellItem = async (): Promise<void> => {
                        if (item?.isOfType("treasure") && !item.isCoinage) {
                            await item.delete();
                            await this.actor.inventory.addCoins(item.assetValue);
                        }
                    };

                    if (event.ctrlKey) {
                        sellItem();
                        return;
                    }

                    const content = document.createElement("p");
                    content.innerText = game.i18n.format("PF2E.SellItemQuestion", {
                        item: item.name,
                    });
                    new Dialog({
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
                    return;
                }
                case "sell-all-treasure": {
                    this.#onClickSellAllTreasure();
                }
            }
        });

        if (panel) {
            $(panel)
                .find(".carry-type-hover")
                .tooltipster({
                    animation: "fade",
                    delay: 200,
                    animationDuration: 10,
                    trigger: "click",
                    arrow: false,
                    contentAsHTML: true,
                    debug: BUILD_MODE === "development",
                    interactive: true,
                    side: ["bottom"],
                    theme: "crb-hover",
                    minWidth: 120,
                });
        }
    }

    /** Inventory drag & drop listeners */
    #activateInventoryDragDrop(panel: HTMLElement | null): void {
        const inventoryList = htmlQuery(panel, "section.inventory-list, ol[data-container-type=actorInventory]");
        if (!inventoryList) return;
        const sortableOptions: Sortable.Options = {
            animation: 200,
            direction: "vertical",
            dragClass: "drag-preview",
            dragoverBubble: true,
            filter: "div.item-summary",
            preventOnFilter: false,
            easing: "cubic-bezier(1, 0, 0, 1)",
            ghostClass: "drag-gap",
            scroll: inventoryList,
            scrollSensitivity: 30,
            scrollSpeed: 15,
            setData: (dataTransfer, dragEl) => {
                const item = this.actor.inventory.get(htmlQuery(dragEl, "div[data-item-id]")?.dataset.itemId, {
                    strict: true,
                });
                dataTransfer.setData("text/plain", JSON.stringify({ ...item.toDragData(), fromInventory: true }));
            },
            onStart: () => {
                // Reset move data
                this.#sortableOnMoveData = {};
            },
            onClone: (event) => {
                // Cloning sets draggable to false for some reason
                for (const link of htmlQueryAll(htmlQuery(event.item, "div.item-summary"), "a.content-link")) {
                    link.draggable = true;
                }
            },
            onMove: (event, originalEvent) => this.#sortableOnMove(event, originalEvent),
            onEnd: (event) => this.#sortableOnEnd(event),
        };

        for (const list of htmlQueryAll(inventoryList, "ol.inventory-items, ol.item-list")) {
            const itemType = list.dataset.itemType;
            // Ignore nested container lists that have the same selector. They will be handled by the backpack section
            if (list.dataset.containerId || !itemType) continue;

            // Containers
            if (itemType === "backpack") {
                Sortable.create(list, {
                    ...sortableOptions,
                    group: {
                        name: "container",
                        put: (_to, _from, dragEl) => dragEl.dataset.itemType === "backpack",
                    },
                    swapThreshold: 0.2,
                });
                // Nested items inside containers
                for (const subList of htmlQueryAll(list, "ol.container-held-items")) {
                    Sortable.create(subList, {
                        ...sortableOptions,
                        group: {
                            name: "nested-item",
                            put: true,
                        },
                        swapThreshold: 0.2,
                    });
                }
                continue;
            }

            // Everything else
            Sortable.create(list, {
                ...sortableOptions,
                group: {
                    name: itemType,
                    put: (to, from, dragEl) => {
                        // Return early if both lists are the same
                        if (from === to) return true;
                        // Allow dragging by item type
                        return dragEl.dataset.itemType === to.el.dataset.itemType;
                    },
                },
            });
        }
    }

    /** Handle dragging of items in the inventory */
    #sortableOnMove(event: Sortable.MoveEvent, originalEvent: Event): boolean | void | 1 | -1 {
        // Prevent sorting if editing is disabled
        if (!this.options.editable) return false;

        // This data is not available in the onEnd event. Store it here.
        this.#sortableOnMoveData = {
            related: event.related,
            willInsertAfter: event.willInsertAfter,
        };
        const sourceItem = this.actor.inventory.get(
            htmlQuery(event.dragged, "div[data-item-id]")?.dataset.itemId ?? ""
        );
        const targetItem = this.actor.inventory.get(
            htmlClosest(originalEvent.target, "div[data-item-id]")?.dataset.itemId ?? ""
        );
        if (sourceItem && targetItem) {
            if (sourceItem.isOfType("backpack") && targetItem.isOfType("backpack") && targetItem.isCollapsed) {
                // Allow a container to be dropped on a collapsed container
                return false;
            }
            // Return false to cancel the move animation
            return !sourceItem.isStackableWith(targetItem);
        }
        return;
    }

    /** Handle drop of inventory items */
    async #sortableOnEnd(event: SortableEvent & { originalEvent?: DragEvent }): Promise<void> {
        // The item that was dropped
        const itemId = htmlQuery(event.item, "div[data-item-id]")?.dataset.itemId;
        const sourceItem = this.actor.inventory.get(itemId, { strict: true });

        // Get the target item if possible. This should only be present if the drop target was a container or a stackable item
        const targetElement = event.originalEvent?.target instanceof HTMLElement ? event.originalEvent.target : null;
        const targetItemId = htmlClosest(targetElement, "div[data-item-id]")?.dataset.itemId ?? "";
        const targetItem = this.actor.inventory.get(targetItemId);

        // Item dragged out of the inventory to some other element like the item sidebar
        if (!targetItem && !event.from.contains(targetElement) && !event.to.contains(targetElement)) {
            // Render the sheet to reset positional changes caused by dragging the item around
            if (event.newIndex !== event.oldIndex) {
                this.render();
            }
            return;
        }

        // Return early if the sheet is not editable
        if (!this.options.editable) return;

        // Drop target is container item
        if (targetItem?.isOfType("backpack")) {
            const toContent = !!htmlClosest(targetElement, "ol[data-container-id]");
            if (!toContent || targetItem.contents.size === 0) {
                // Container item was targeted directly or container is empty. Move to container and be done
                return sourceItem.move({ toContainer: targetItem as ContainerPF2e<ActorPF2e> });
            }
        }

        // Get the item that the source item was dropped relative to
        const { related, willInsertAfter } = this.#sortableOnMoveData;
        const relativeItemId = htmlQuery(related, "div[data-item-id]")?.dataset.itemId ?? "";
        const relativeItem = this.actor.inventory.get(relativeItemId);

        if (relativeItem || targetItem) {
            if (targetItem && !targetItem.isOfType("backpack")) {
                // A targetItem that is not a container should be stackable with the source item
                return sourceItem.move({
                    toStack: targetItem,
                });
            }
            // Move source item relative to relativeItem. Containers are handled by the move mehtod
            return sourceItem.move({
                relativeTo: relativeItem,
                sortBefore: !willInsertAfter,
            });
        }
    }

    async #onClickDeleteItem(event: MouseEvent): Promise<void> {
        const row = htmlClosest(event.currentTarget, "[data-item-id]");
        const itemId = row?.dataset.itemId;
        const item = this.actor.items.get(itemId ?? "");

        if (item?.isOfType("condition")) {
            const references = htmlQuery(row, ".condition-references");

            const deleteCondition = async (): Promise<void> => {
                this.actor.decreaseCondition(item, { forceRemove: true });
            };

            if (event.ctrlKey) {
                deleteCondition();
                return;
            }

            const content = await renderTemplate("systems/pf2e/templates/actors/delete-condition-dialog.hbs", {
                question: game.i18n.format("PF2E.DeleteConditionQuestion", { condition: item.name }),
                ref: references?.innerHTML,
            });
            new Dialog({
                title: game.i18n.localize("PF2E.DeleteConditionTitle"),
                content,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: "Yes",
                        callback: deleteCondition,
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                    },
                },
                default: "Yes",
            }).render(true);
        } else if (row && item) {
            this.deleteItem(row, item, event);
        } else {
            throw ErrorPF2e("Item not found");
        }
    }

    protected async deleteItem(element: HTMLElement, item: ItemPF2e, event?: MouseEvent): Promise<void> {
        const deleteItem = async (): Promise<void> => {
            await item.delete();
            $(element).slideUp(200, () => this.render(false));
        };
        if (event?.ctrlKey) {
            deleteItem();
            return;
        }

        const content = await renderTemplate("systems/pf2e/templates/actors/delete-item-dialog.hbs", {
            name: item.name,
        });
        new Dialog({
            title: "Delete Confirmation",
            content,
            buttons: {
                Yes: {
                    icon: '<i class="fa fa-check"></i>',
                    label: "Yes",
                    callback: deleteItem,
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                },
            },
            default: "Yes",
        }).render(true);
    }

    async #onClickBrowseEquipmentCompendia(element: HTMLElement): Promise<void> {
        const maxLevel = Number(element.dataset.level) || this.actor.level;
        const checkboxesFilterCodes = (element.dataset.filter ?? "")
            .split(",")
            .filter((s) => !!s)
            .map((s) => s.trim());

        const eqTab = game.pf2e.compendiumBrowser.tabs.equipment;
        const filter = await eqTab.getFilterData();
        const { checkboxes } = filter;
        const { level } = filter.sliders;
        level.values.max = Math.min(maxLevel, level.values.upperLimit);
        level.isExpanded = level.values.max !== level.values.upperLimit;

        for (const filterCode of checkboxesFilterCodes) {
            const splitValues = filterCode.split("-");
            if (splitValues.length !== 2) {
                throw ErrorPF2e(`Invalid filter value for opening the compendium browser: "${filterCode}"`);
            }
            const [filterType, value] = splitValues;
            if (objectHasKey(checkboxes, filterType)) {
                const checkbox = checkboxes[filterType];
                if (objectHasKey(checkbox.options, value)) {
                    checkbox.options[value].selected = true;
                    checkbox.selected.push(value);
                    checkbox.isExpanded = true;
                }
            }
        }

        eqTab.open(filter);
    }

    protected override _canDragStart(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragStart(selector);
    }

    protected override _canDragDrop(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragDrop(selector);
    }

    /** Add support for dropping actions and toggles */
    protected override _onDragStart(event: ElementDragEvent): void {
        // Avoid intercepting content-link drag targets
        const isContentLink = event.target.classList.contains("content-link");
        const isPersistent = "persistent" in event.target.dataset;
        if (event.target !== event.currentTarget && (isContentLink || isPersistent)) {
            return;
        }

        const targetElement = event.currentTarget;
        const previewElement = htmlClosest(targetElement, ".item");

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
            sceneId: canvas.scene?.id ?? null,
            tokenId: this.actor.token?.id ?? null,
            ...item?.toDragData(),
        };
        if (previewElement?.dataset.isFormula) {
            baseDragData.isFormula = true;
            baseDragData.entrySelector = previewElement.dataset.entrySelector;
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

            // ... a roll-option toggle?
            const label = previewElement?.innerText.trim();
            const rollOptionData = previewElement?.dataset ?? {};
            if (item && label && rollOptionData.domain && rollOptionData.option) {
                return {
                    type: "RollOption",
                    label,
                    img: item.img,
                    ...rollOptionData,
                };
            }

            // ... a crafting formula?
            if (baseDragData.isFormula) {
                return {
                    pf2e: {
                        type: "CraftingFormula",
                        itemUuid: itemId,
                    },
                };
            }

            // ... something else?
            return null;
        })();

        event.dataTransfer.setData("text/plain", JSON.stringify({ ...baseDragData, ...supplementalData }));
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(
        event: ElementDragEvent,
        itemSource: ItemSourcePF2e
    ): Promise<ItemPF2e<TActor>[]>;
    protected override async _onSortItem(event: ElementDragEvent, itemSource: ItemSourcePF2e): Promise<Item<TActor>[]> {
        return super._onSortItem(event, itemSource);
    }

    /** Emulate a sheet item drop from the canvas */
    async emulateItemDrop(data: DropCanvasItemDataPF2e): Promise<ItemPF2e<ActorPF2e | null>[]> {
        return this._onDropItem({ preventDefault(): void {} } as ElementDragEvent, data);
    }

    protected override async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasItemDataPF2e & { fromInventory?: boolean }
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        if (!item) return [];

        if (item.actor?.uuid === this.actor.uuid) {
            // Drops from inventory are handled by Sortable
            return data.fromInventory ? [] : this._onSortItem(event, item.toObject());
        }

        if (item.actor && item.isOfType("physical")) {
            await this.moveItemBetweenActors(
                event,
                item.actor.id,
                item.actor?.token?.id ?? null,
                this.actor.id,
                this.actor.token?.id ?? null,
                item.id
            );
            return [item];
        }

        return this._handleDroppedItem(event, item, data);
    }

    /**
     * PF2e specific method called by _onDropItem() when this is a new item that needs to be dropped into the actor
     * that isn't already on the actor or transferring to another actor.
     */
    protected async _handleDroppedItem(
        event: ElementDragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: DropCanvasItemDataPF2e
    ): Promise<ItemPF2e<ActorPF2e | null>[]>;
    protected async _handleDroppedItem(
        event: ElementDragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: DropCanvasItemDataPF2e
    ): Promise<Item<ActorPF2e | null>[]> {
        const { actor } = this;
        const itemSource = item.toObject();

        const mystified = game.user.isGM && event.altKey;

        // Set effect to unidentified if alt key is held
        if (mystified && itemSource.type === "effect") {
            itemSource.system.unidentified = true;
        }

        // mystify the item if the alt key was pressed
        if (mystified && item.isOfType("physical") && isPhysicalData(itemSource)) {
            itemSource.system.identification.unidentified = item.getMystifiedData("unidentified");
            itemSource.system.identification.status = "unidentified";
        }

        // Get the item type of the drop target
        const $containerEl = $(event.target).closest(".item-container");
        const containerAttribute = $containerEl.attr("data-container-type");
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
                    item
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
        } else if (itemSource.type === "effect" || itemSource.type === "affliction") {
            // Pass along level, badge-value, and traits to an effect dragged from a spell
            const { level, value, context } = data;
            if (typeof level === "number" && level >= 0) {
                itemSource.system.level.value = Math.floor(level);
            }
            const hasCounterBadge = itemSource.type === "effect" && itemSource.system.badge?.type === "counter";
            if (hasCounterBadge && typeof value === "number") {
                itemSource.system.badge!.value = value;
            }
            itemSource.system.context = context ?? null;
            const originItem = fromUuidSync(context?.origin.item ?? "");
            if (itemSource.system.traits?.value.length === 0 && originItem instanceof SpellPF2e) {
                itemSource.system.traits.value.push(...originItem.traits);
            }
        } else if (item.isOfType("physical") && actor.isOfType("character") && craftingTab) {
            const actorFormulas = deepClone(actor.system.crafting.formulas);
            if (!actorFormulas.some((f) => f.uuid === item.uuid)) {
                actorFormulas.push({ uuid: item.uuid });
                await actor.update({ "system.crafting.formulas": actorFormulas });
            }
            return [item];
        }

        if (isPhysicalData(itemSource)) {
            const containerId =
                $(event.target).closest('[data-item-is-container="true"]').attr("data-item-id")?.trim() || null;
            const container = this.actor.itemTypes.backpack.find((container) => container.id === containerId);
            if (container) {
                itemSource.system.containerId = containerId;
                itemSource.system.equipped.carryType = "stowed";
            } else {
                itemSource.system.equipped.carryType = "worn";
            }
            // If the item is from a compendium, adjust the size to be appropriate to the creature's
            const resizeItem =
                data?.uuid?.startsWith("Compendium") &&
                itemSource.type !== "treasure" &&
                !["med", "sm"].includes(actor.size) &&
                actor.isOfType("creature");
            if (resizeItem) itemSource.system.size = actor.size;
        }

        // Creating a new item: clear the _id via cloning it
        return this._onDropItemCreate(new ItemProxyPF2e(itemSource).clone().toObject());
    }

    protected override async _onDropFolder(
        _event: ElementDragEvent,
        data: DropCanvasData<"Folder", Folder>
    ): Promise<ItemPF2e<TActor>[]>;
    protected override async _onDropFolder(
        _event: ElementDragEvent,
        data: DropCanvasData<"Folder", Folder>
    ): Promise<Item<TActor>[]> {
        if (!(this.actor.isOwner && data.documentName === "Item")) return [];
        const folder = (await Folder.fromDropData(data)) as Folder<ItemPF2e<null>> | undefined;
        if (!folder) return [];
        const itemSources = [folder, ...folder.getSubfolders()].flatMap((f) => f.contents).map((i) => i.toObject());
        return this._onDropItemCreate(itemSources);
    }

    /**
     * Moves an item between two actors' inventories.
     * @param event         Event that fired this method.
     * @param sourceActorId ID of the actor who originally owns the item.
     * @param targetActorId ID of the actor where the item will be stored.
     * @param itemId           ID of the item to move between the two actors.
     */
    async moveItemBetweenActors(
        event: ElementDragEvent,
        sourceActorId: string,
        sourceTokenId: string | null,
        targetActorId: string,
        targetTokenId: string | null,
        itemId: string
    ): Promise<void> {
        const sourceActor = canvas.scene?.tokens.get(sourceTokenId ?? "")?.actor ?? game.actors.get(sourceActorId);
        const targetActor = canvas.scene?.tokens.get(targetTokenId ?? "")?.actor ?? game.actors.get(targetActorId);
        const item = sourceActor?.items.get(itemId);

        if (!sourceActor || !targetActor) {
            throw ErrorPF2e("Unexpected missing actor(s)");
        }
        if (!item?.isOfType("physical")) {
            throw ErrorPF2e("Missing or invalid item");
        }

        const container = $(event.target).parents("[data-item-is-container=true]");
        const containerId = container[0] !== undefined ? container[0].dataset.itemId?.trim() : undefined;
        const sourceItemQuantity = item.quantity;
        const stackable = !!targetActor.findStackableItem(targetActor, item._source);
        const isPurchase = sourceActor.isOfType("loot") && sourceActor.isMerchant && !sourceActor.isOwner;
        const isAmmunition = item.isOfType("consumable") && item.isAmmunition;

        // If more than one item can be moved, show a popup to ask how many to move
        if (sourceItemQuantity > 1) {
            const defaultQuantity = isPurchase
                ? isAmmunition
                    ? Math.min(10, sourceItemQuantity)
                    : 1
                : sourceItemQuantity;
            const popup = new MoveLootPopup(
                sourceActor,
                { quantity: { max: sourceItemQuantity, default: defaultQuantity }, lockStack: !stackable, isPurchase },
                (quantity, newStack) => {
                    sourceActor.transferItemToActor(targetActor, item, quantity, containerId, newStack);
                }
            );

            popup.render(true);
        } else {
            sourceActor.transferItemToActor(targetActor, item, 1, containerId);
        }
    }

    /** Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset */
    #onClickCreateItem(link: HTMLElement): void {
        const data = link.dataset;
        if (!objectHasKey(CONFIG.PF2E.Item.documentClasses, data.type)) {
            throw ErrorPF2e(`Unrecognized item type: "${data.type}"`);
        }

        if (data.type === "spell") {
            return onClickCreateSpell(this.actor, data);
        }

        const img: ImageFilePath = `systems/pf2e/icons/default-icons/${data.type}.svg`;
        const type = data.type;
        const itemSource = ((): DeepPartial<ItemSourcePF2e> | null => {
            switch (type) {
                case "action": {
                    const name = game.i18n.localize(`PF2E.ActionType${String(data.actionType).capitalize()}`);
                    const actionType = data.actionType as ActionType;
                    return { type, img, name, system: { actionType: { value: actionType } } };
                }
                case "melee": {
                    const name = game.i18n.localize(`PF2E.NewPlaceholders.${type.capitalize()}`);
                    const weaponType = data.actionType as "melee" | "ranged";
                    return { type, img, name, system: { weaponType: { value: weaponType } } };
                }
                case "lore": {
                    const name =
                        this.actor.type === "npc"
                            ? game.i18n.localize("PF2E.SkillLabel")
                            : game.i18n.localize("PF2E.NewPlaceholders.Lore");
                    return { type, img, name };
                }
                default: {
                    if (!setHasElement(PHYSICAL_ITEM_TYPES, type)) {
                        throw ErrorPF2e(`Unsupported item type: ${type}`);
                    }
                    const name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
                    return { name, type };
                }
            }
        })();

        if (itemSource) {
            if (data.traits) {
                const traits = String(data.traits).split(",");
                itemSource.system = mergeObject(itemSource.system ?? {}, { traits: { value: traits } });
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
        options?: Partial<TagSelectorOptions> | BasicConstructorOptions
    ): void {
        if (selectorType === "basic" && options && "objectProperty" in options) {
            new TagSelectorBasic(this.object, options).render(true);
        } else if (selectorType === "basic") {
            throw ErrorPF2e("Insufficient options provided to render basic tag selector");
        } else {
            const TagSelector = {
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

    /** Hide the sheet-config button unless there is more than one sheet option. */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const sheetButton = buttons.find((button) => button.class === "configure-sheet");
        const hasMultipleSheets = Object.keys(CONFIG.Actor.sheetClasses[this.actor.type]).length > 1;
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        return buttons;
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

    /** Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error */
    protected override async _onSubmit(
        event: Event,
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        for (const input of htmlQueryAll<HTMLInputElement>(this.form, "tags ~ input")) {
            if (input.value === "") input.value = "[]";
        }

        return super._onSubmit(event, { updateData, preventClose, preventRender });
    }

    protected override _getSubmitData(updateData?: DocumentUpdateData<TActor>): Record<string, unknown> {
        const data = super._getSubmitData(updateData);
        processTagifyInSubmitData(this.form, data);

        // Use delta values for inputs that have `data-allow-delta` if input value starts with + or -
        for (const el of this.form.elements) {
            if (el instanceof HTMLInputElement && el.dataset.allowDelta !== undefined) {
                const strValue = el.value.trim();
                const value = Number(strValue);
                if ((strValue.startsWith("+") || strValue.startsWith("-")) && !Number.isNaN(value))
                    data[el.name] = Number(getProperty(this.actor, el.name)) + value;
            }
        }

        return data;
    }
}

interface ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    prepareItems?(sheetData: ActorSheetDataPF2e<TActor>): Promise<void>;
}

export { ActorSheetPF2e };
