import type { ActorPF2e, CharacterPF2e } from "@actor";
import { ActorDataPF2e } from "@actor/data";
import { RollFunction, StrikeData } from "@actor/data/base";
import { SAVE_TYPES } from "@actor/values";
import { Coins, createConsumableFromSpell, DENOMINATIONS, ItemPF2e, PhysicalItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data";
import { createSheetTags, maintainTagifyFocusInRender, processTagifyInSubmitData } from "@module/sheet/helpers";
import { eventToRollParams } from "@scripts/sheet-util";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { LocalizePF2e } from "@system/localize";
import {
    BasicConstructorOptions,
    ResistanceSelector,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    SenseSelector,
    SpeedSelector,
    TagSelectorBasic,
    TagSelectorOptions,
    TagSelectorType,
    TAG_SELECTOR_TYPES,
    WeaknessSelector,
} from "@system/tag-selector";
import { ErrorPF2e, objectHasKey, tupleHasValue } from "@util";
import { ActorSizePF2e } from "../data/size";
import { ActorSheetDataPF2e, CoinageSummary, InventoryItem, SheetInventory } from "./data-types";
import { ItemSummaryRenderer } from "./item-summary-renderer";
import { MoveLootPopup } from "./loot/move-loot-popup";
import { AddCoinsPopup } from "./popups/add-coins-popup";
import { IdentifyItemPopup } from "./popups/identify-popup";
import { RemoveCoinsPopup } from "./popups/remove-coins-popup";
import { ScrollWandPopup } from "./popups/scroll-wand-popup";

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
abstract class ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.dragDrop.push({ dragSelector: ".drag-handle" }, { dragSelector: ".item[draggable=true]" });
        return mergeObject(options, {
            classes: ["default", "sheet", "actor"],
            scrollY: [".sheet-sidebar", ".tab.active", ".inventory-list"],
        });
    }

    /** Implementation used to handle the toggling and rendering of item summaries */
    itemRenderer: ItemSummaryRenderer<TActor> = new ItemSummaryRenderer(this);

    /** Can non-owning users loot items from this sheet? */
    get isLootSheet(): boolean {
        return false;
    }

    override async getData(options: ActorSheetOptions = this.options): Promise<ActorSheetDataPF2e<TActor>> {
        options.id ||= this.id;
        // The Actor and its Items
        const actorData = this.actor.toObject(false) as RawObject<ActorDataPF2e>;

        // Calculate financial and total wealth
        const coins = this.actor.inventory.coins;
        const totalCoinage = ActorSheetPF2e.coinsToSheetData(coins);
        const totalCoinageGold = (coins.copperValue / 100).toFixed(2);

        const totalWealth = this.actor.inventory.totalWealth;
        const totalWealthGold = (totalWealth.copperValue / 100).toFixed(2);

        // IWR
        const immunities = createSheetTags(CONFIG.PF2E.immunityTypes, actorData.system.traits.di);
        for (const weakness of actorData.system.traits.dv) {
            weakness.label = CONFIG.PF2E.weaknessTypes[weakness.type];
        }
        for (const resistance of actorData.system.traits.dr) {
            resistance.label = CONFIG.PF2E.resistanceTypes[resistance.type];
        }

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
            immunities,
            hasImmunities: Object.keys(immunities).length > 0,
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
        const createInventoryItem = (item: PhysicalItemPF2e): InventoryItem => {
            const editable = game.user.isGM || item.isIdentified;
            const heldItems = item.isOfType("backpack") ? item.contents.map((i) => createInventoryItem(i)) : undefined;
            heldItems?.sort((a, b) => (a.item.sort || 0) - (b.item.sort || 0));

            const itemSize = new ActorSizePF2e({ value: item.size });
            const sizeDifference = itemSize.difference(actorSize, { smallIsMedium: true });

            const canBeEquipped = !item.isInContainer;

            return {
                item: item,
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

        const invested = this.actor.inventory.invested;
        const showValueAlways = this.actor.isOfType("npc", "loot");
        const showIndividualPricing = this.actor.isOfType("loot");
        return { sections, bulk: this.actor.inventory.bulk, showValueAlways, showIndividualPricing, invested };
    }

    protected static coinsToSheetData(coins: Coins): CoinageSummary {
        return DENOMINATIONS.reduce(
            (accumulated, denomination) => ({
                ...accumulated,
                [denomination]: {
                    value: coins[denomination],
                    label: CONFIG.PF2E.currencies[denomination],
                },
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

        // Item summaries
        this.itemRenderer.activateListeners($html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        /* -------------------------------------------- */
        /*  Attributes, Skills, Saves and Traits        */
        /* -------------------------------------------- */

        if (!["character", "npc"].includes(this.actor.type)) InlineRollLinks.listen($html, this.actor);

        $html.find("[data-action=show-image]").on("click", () => {
            const actor = this.actor;
            const title = actor.token?.name ?? actor.prototypeToken?.name ?? actor.name;
            new ImagePopout(actor.img, { title, uuid: actor.uuid }).render(true);
        });

        // Roll Save Checks
        $html.find(".save-name").on("click", (event) => {
            event.preventDefault();
            const saveType = $(event.currentTarget).closest("[data-save]")[0].getAttribute("data-save");
            if (!tupleHasValue(SAVE_TYPES, saveType)) {
                throw ErrorPF2e(`"${saveType}" is not a recognized save type`);
            }

            this.actor.saves?.[saveType]?.check.roll(eventToRollParams(event));
        });

        $html.find(".roll-init").on("click", (event) => {
            const $target = $(event.currentTarget);
            const { attributes } = this.actor.system;
            if (!$target.hasClass("disabled") && "initiative" in attributes) {
                attributes.initiative.roll?.(eventToRollParams(event));
            }
        });

        const toggleSelector = "input[type=checkbox][data-action=toggle-roll-option]";
        $html.find<HTMLInputElement>(toggleSelector).on("change", async (event) => {
            const { domain, option, itemId } = event.target.dataset;
            if (domain && option) {
                const value = !!event.target.checked;
                this.actor.toggleRollOption(domain, option, itemId ?? null, value);
            }
        });

        // Roll Attribute Checks
        $html.find(".attribute-name").on("click", (event) => {
            event.preventDefault();
            const key = event.currentTarget.parentElement?.getAttribute("data-attribute") || "";
            const isSecret = event.currentTarget.getAttribute("data-secret");
            const attributes: object = this.actor.system.attributes;
            const attribute: unknown = objectHasKey(attributes, key) ? attributes[key] : null;
            const isRollable = (property: unknown): property is { roll: RollFunction } =>
                property instanceof Object && "roll" in property && typeof property["roll"] === "function";
            if (isRollable(attribute)) {
                const options = this.actor.getRollOptions(["all", key]);
                if (isSecret) options.push("secret");
                attribute.roll({ event, options });
            } else {
                this.actor.rollAttribute(event, key);
            }
        });

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

        $html.find(".carry-type-hover").tooltipster({
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

        // Trait Selector
        $html.find(".tag-selector").on("click", (event) => this.onTraitSelector(event));

        $html.find(".add-coins-popup button").on("click", (event) => this.onAddCoinsPopup(event));

        $html.find(".remove-coins-popup button").on("click", (event) => this.onRemoveCoinsPopup(event));

        $html.find(".sell-all-treasure button").on("click", (event) => this.onSellAllTreasure(event));

        // Inventory Browser
        $html.find(".inventory-browse").on("click", (event) => this.onClickBrowseEquipmentCompendia(event));

        const $spellcasting = $html.find(".tab.spellcasting, .tab.spells");
        const $spellControls = $spellcasting.find(".item-control");
        // Spell Create
        $spellControls.filter(".spell-create").on("click", (event) => this.onClickCreateItem(event));

        /* -------------------------------------------- */
        /*  Inventory                                   */
        /* -------------------------------------------- */

        // Create New Item
        $html.find(".item-create").on("click", (event) => this.onClickCreateItem(event));

        $html.find(".item-repair").on("click", (event) => this.repairItem(event));

        $html.find(".item-toggle-container").on("click", (event) => this.toggleContainer(event));

        // Sell treasure item
        $html.find(".item-sell-treasure").on("click", async (event) => {
            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const item = this.actor.inventory.get(itemId);
            if (item?.isOfType("treasure") && !item.isCoinage) {
                await item.delete();
                await this.actor.inventory.addCoins(item.assetValue);
            }
        });

        // Update an embedded item
        $html.find(".item-edit").on("click", (event) => {
            const itemId = $(event.currentTarget).closest("[data-item-id]").attr("data-item-id");
            const item = this.actor.items.get(itemId ?? "");
            item?.sheet.render(true, { focus: true });
        });

        // Toggle identified
        $html.find(".item-toggle-identified").on("click", (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents(".item").attr("data-item-id") ?? "";
            const identified = f.hasClass("identified");
            if (identified) {
                const item = this.actor.items.get(itemId);
                if (!item?.isOfType("physical")) {
                    throw ErrorPF2e(`${itemId} is not a physical item.`);
                }
                item.setIdentificationStatus("unidentified");
            } else {
                const item = this.actor.items.get(itemId);
                if (item?.isOfType("physical")) {
                    new IdentifyItemPopup(item).render(true);
                }
            }
        });

        // Delete Inventory Item
        $html.find(".item-delete").on("click", (event) => this.onClickDeleteItem(event));

        // Increase Item Quantity
        $html.find(".item-increase-quantity").on("click", (event) => {
            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId);
            if (!item?.isOfType("physical")) {
                throw new Error("PF2e System | Tried to update quantity on item that does not have quantity");
            }
            this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.quantity": item.quantity + 1 }]);
        });

        // Decrease Item Quantity
        $html.find(".item-decrease-quantity").on("click", (event) => {
            const li = $(event.currentTarget).parents(".item");
            const itemId = li.attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId);
            if (!item?.isOfType("physical")) {
                throw ErrorPF2e("Tried to update quantity on item that does not have quantity");
            }
            if (item.quantity > 0) {
                this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.quantity": item.quantity - 1 }]);
            }
        });

        // Item Rolling
        $html
            .find(".item[data-item-id] .item-image, .item[data-item-id] .item-chat")
            .on("click", (event) => this.onClickItemToChat(event));

        // Delete Formula
        $html.find(".formula-delete").on("click", (event) => {
            event.preventDefault();

            const itemUuid = $(event.currentTarget).parents(".item").attr("data-item-id");
            if (!itemUuid) return;

            if (this.actor.isOfType("character")) {
                const actorFormulas = (this.actor.toObject().system as CharacterPF2e["system"]).crafting.formulas ?? [];
                actorFormulas.findSplice((f) => f.uuid === itemUuid);
                this.actor.update({ "system.crafting.formulas": actorFormulas });
            }
        });

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
        $html.find<HTMLInputElement>("input[type=text], input[type=number]").on("focus", (event) => {
            event.currentTarget.select();
        });

        // Only allow digits & leading plus and minus signs for `data-allow-delta` inputs thus emulating input[type="number"]
        $html.find("input[data-allow-delta]").on("input", (event) => {
            const target = <HTMLInputElement>event.target;
            const match = target.value.match(/[+-]?\d*/);
            if (match) target.value = match[0];
            else target.value = "";
        });
    }

    async onClickDeleteItem(event: JQuery.TriggeredEvent): Promise<void> {
        const $li = $(event.currentTarget).closest("[data-item-id]");
        const itemId = $li.attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);

        if (item?.isOfType("condition")) {
            const references = $li.find(".condition-references");

            const deleteCondition = async (): Promise<void> => {
                this.actor.decreaseCondition(item, { forceRemove: true });
            };

            if (event.ctrlKey) {
                deleteCondition();
                return;
            }

            const content = await renderTemplate("systems/pf2e/templates/actors/delete-condition-dialog.html", {
                question: game.i18n.format("PF2E.DeleteConditionQuestion", { condition: item.name }),
                ref: references.html(),
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
        } else if (item) {
            const deleteItem = async (): Promise<void> => {
                await item.delete();
                $li.slideUp(200, () => this.render(false));
            };
            if (event.ctrlKey) {
                deleteItem();
                return;
            }

            const content = await renderTemplate("systems/pf2e/templates/actors/delete-item-dialog.html", {
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
        } else {
            throw ErrorPF2e("Item not found");
        }
    }

    private async onClickBrowseEquipmentCompendia(event: JQuery.ClickEvent<HTMLElement>): Promise<void> {
        const checkboxesFilterCodes: string[] = [$(event.currentTarget).attr("data-filter")].filter(
            (element): element is string => !!element
        );

        const filter: Record<string, string[]> = {};
        for (const filterCode of checkboxesFilterCodes) {
            const splitValues = filterCode.split("-");
            if (splitValues.length !== 2) {
                console.error(
                    `Invalid filter value for opening the compendium browser:\n'${JSON.stringify(
                        checkboxesFilterCodes
                    )}'`
                );
                return;
            }

            const [filterType, value] = splitValues;
            const filterCategory = filter[filterType] ?? (filter[filterType] = []);
            filterCategory.push(value);
        }

        await game.pf2e.compendiumBrowser.openTab("equipment", filter);
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
        if (event.target !== event.currentTarget && event.target.classList.contains("content-link")) {
            return;
        }

        const $target = $(event.currentTarget);
        const $itemRef = $target.closest(".item");

        // Show a different drag/drop preview element and copy some data if this is a handle
        // This will make the preview nicer and also trick foundry into thinking the actual item started drag/drop
        const targetElement = $target.get(0);
        const previewElement = $itemRef.get(0);
        if (previewElement && targetElement && targetElement !== previewElement) {
            const { x, y } = previewElement.getBoundingClientRect();
            event.dataTransfer.setDragImage(previewElement, event.pageX - x, event.pageY - y);
        }

        const itemId = $itemRef.attr("data-item-id");
        const item = this.actor.items.get(itemId ?? "");

        const baseDragData: { [key: string]: unknown } = {
            actorId: this.actor.id,
            sceneId: canvas.scene?.id ?? null,
            tokenId: this.actor.token?.id ?? null,
            ...item?.toDragData(),
        };

        // Dragging ...
        const supplementalData = (() => {
            const actionIndex = $itemRef.attr("data-action-index");
            const rollOptionData = {
                ...($itemRef.find("input[type=checkbox][data-action=toggle-roll-option]").get(0)?.dataset ?? {}),
            };
            const itemType = $itemRef.attr("data-item-type");

            // ... an action?
            if (actionIndex) {
                return {
                    type: "Action",
                    index: Number(actionIndex),
                };
            }

            // ... a roll-option toggle?
            if (item && Object.keys(rollOptionData).length > 0) {
                const label = $itemRef.text().trim();
                delete rollOptionData.action;
                return {
                    type: "RollOption",
                    label,
                    img: item.img,
                    ...rollOptionData,
                };
            }

            // ... a crafting formula?
            if (itemType === "formula") {
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
    protected override async _onSortItem(event: ElementDragEvent, itemSource: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const item = this.actor.items.get(itemSource._id);
        if (!item) return [];

        if (item.isOfType("physical")) {
            const $target = $(event.target).closest("[data-item-id]");
            const targetId = $target.attr("data-item-id") ?? "";
            const target = this.actor.inventory.get(targetId);

            if (target && item.isStackableWith(target)) {
                const stackQuantity = item.quantity + target.quantity;
                if (await item.delete({ render: false })) {
                    await target.update({ "system.quantity": stackQuantity });
                }

                return [];
            }

            const $container = $(event.target).closest('[data-item-is-container="true"]');
            const containerId = $container.attr("data-item-id") ?? "";
            const container = this.actor.inventory.get(containerId);
            const pullingOutOfContainer = item.isInContainer && !container;
            const puttingIntoContainer = container?.isOfType("backpack") && item.container?.id !== container.id;
            if (pullingOutOfContainer || puttingIntoContainer) {
                await this.actor.stowOrUnstow(item, container);
                return [item];
            }

            // This is a regular resort, but we can't rely on the default foundry resort implementation.
            // The default implement only treats same type as siblings, and physical can have many sub-types.
            if (target) {
                const siblings = this.actor.items.filter((i) => i.isOfType("physical"));
                await item.sortRelative({ target, siblings });
                return [target];
            }
        }

        return super._onSortItem(event, itemSource);
    }

    /** Emulate a sheet item drop from the canvas */
    async emulateItemDrop(data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
        return this._onDropItem({ preventDefault(): void {} } as ElementDragEvent, data);
    }

    protected override async _onDropItem(event: ElementDragEvent, data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        if (!item) return [];
        const itemSource = item.toObject();

        const actor = this.actor;
        const sourceActorId = item.parent?.id ?? "";
        const sourceTokenId = item.parent?.token?.id ?? "";
        const isSameActor = sourceActorId === actor.id || (item.parent?.isToken && sourceTokenId === actor.token?.id);
        if (isSameActor) return this._onSortItem(event, itemSource);

        const sourceItemId = itemSource._id;
        if (sourceActorId && item.isOfType("physical")) {
            await this.moveItemBetweenActors(
                event,
                sourceActorId,
                sourceTokenId,
                actor.id,
                actor.token?.id ?? "",
                sourceItemId
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
        item: ItemPF2e,
        data: DropCanvasItemDataPF2e
    ): Promise<ItemPF2e[]> {
        const { actor } = this;
        const itemSource = item.toObject();

        // Set effect to unidentified if alt key is held
        if (game.user.isGM && itemSource.type === "effect") {
            const altHeld = event.altKey || game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT);
            itemSource.system.unidentified ||= altHeld;
        }

        // mystify the item if the alt key was pressed
        if (event.altKey && item.isOfType("physical") && isPhysicalData(itemSource)) {
            itemSource.system.identification.unidentified = item.getMystifiedData("unidentified");
            itemSource.system.identification.status = "unidentified";
        }

        // get the item type of the drop target
        const $containerEl = $(event.target).closest(".item-container");
        const containerAttribute = $containerEl.attr("data-container-type");
        const unspecificInventory = this._tabs[0]?.active === "inventory" && !containerAttribute;
        const dropContainerType = unspecificInventory ? "actorInventory" : containerAttribute;
        const craftingTab = this._tabs[0]?.active === "crafting";

        // otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (item.isOfType("spell") && itemSource.type === "spell") {
            if (dropContainerType === "actorInventory" && itemSource.system.level.value > 0) {
                const popup = new ScrollWandPopup(
                    actor,
                    {},
                    async (heightenedLevel, itemType, spell) => {
                        if (!(itemType === "scroll" || itemType === "wand")) return;
                        const item = await createConsumableFromSpell(itemType, spell, heightenedLevel);
                        await this._onDropItemCreate(item);
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
                const translations = LocalizePF2e.translations.PF2E;
                ui.notifications.error(translations.ErrorMessage.NoUpdatePermission);
                return [];
            } else {
                const updated = await actor.increaseCondition(itemSource.system.slug, {
                    min: itemSource.system.value.value,
                });
                return [updated ?? []].flat();
            }
        } else if (itemSource.type === "effect") {
            const { level, value, context } = data;
            if (typeof level === "number" && level >= 0) {
                itemSource.system.level.value = level;
            }
            if (typeof value === "number" && itemSource.system.badge?.type === "counter") {
                itemSource.system.badge.value = value;
            }
            itemSource.system.context = context ?? null;
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
        return this._onDropItemCreate(itemSource);
    }

    protected override async _onDropFolder(
        _event: ElementDragEvent,
        data: DropCanvasData<"Folder", Folder>
    ): Promise<ItemPF2e[]> {
        if (!(this.actor.isOwner && data.documentName === "Item")) return [];
        const folder = (await Folder.fromDropData(data)) as Folder<ItemPF2e> | undefined;
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
        sourceTokenId: string,
        targetActorId: string,
        targetTokenId: string,
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

        const container = $(event.target).parents('[data-item-is-container="true"]');
        const containerId = container[0] !== undefined ? container[0].dataset.itemId?.trim() : undefined;
        const sourceItemQuantity = item.quantity;
        const stackable = !!targetActor.findStackableItem(targetActor, item._source);
        const isPurchase = sourceActor.isOfType("loot") && sourceActor.isMerchant && !sourceActor.isOwner;

        // If more than one item can be moved, show a popup to ask how many to move
        if (sourceItemQuantity > 1) {
            const popup = new MoveLootPopup(
                sourceActor,
                { maxQuantity: sourceItemQuantity, lockStack: !stackable, isPurchase },
                (quantity, newStack) => {
                    sourceActor.transferItemToActor(targetActor, item, quantity, containerId, newStack);
                }
            );

            popup.render(true);
        } else {
            sourceActor.transferItemToActor(targetActor, item, 1, containerId);
        }
    }

    /** Post the item's summary as a chat message */
    private async onClickItemToChat(event: JQuery.ClickEvent) {
        const itemId = $(event.currentTarget).closest("[data-item-id]").attr("data-item-id");
        const item = this.actor.items.get(itemId ?? "", { strict: true });
        if (item.isOfType("physical") && !item.isIdentified) return;
        await item.toMessage(event, { create: true });
    }

    /** Attempt to repair the item */
    private async repairItem(event: JQuery.ClickEvent): Promise<void> {
        const itemId = $(event.currentTarget).parents(".item").data("item-id");
        const item = this.actor.items.get(itemId);
        if (!item) return;

        await game.pf2e.actions.repair({ event, item });
    }

    /** Opens an item container */
    private async toggleContainer(event: JQuery.ClickEvent): Promise<void> {
        const itemId = $(event.currentTarget).parents(".item").data("item-id");
        const item = this.actor.items.get(itemId);
        if (!item?.isOfType("backpack")) return;

        const isCollapsed = item.system.collapsed ?? false;
        await item.update({ "system.collapsed": !isCollapsed });
    }

    /** Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset */
    private onClickCreateItem(event: JQuery.ClickEvent) {
        event.preventDefault();
        const header = event.currentTarget;
        const data = duplicate(header.dataset);
        data.img = `systems/pf2e/icons/default-icons/${data.type}.svg`;

        if (data.type === "action") {
            const newLabel = game.i18n.localize("PF2E.NewLabel");
            const actionTypeLabel = game.i18n.localize(`PF2E.ActionType${data.actionType.capitalize()}`);
            data.name = `${newLabel} ${actionTypeLabel}`;
            mergeObject(data, { "system.actionType.value": data.actionType });
        } else if (data.type === "melee") {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
            mergeObject(data, { "system.weaponType.value": data.actionType });
        } else if (data.type === "spell") {
            data.level = Number(data.level ?? 1);
            const newLabel = game.i18n.localize("PF2E.NewLabel");
            const levelLabel = game.i18n.localize(`PF2E.SpellLevel${data.level}`);
            const spellLabel = data.level > 0 ? game.i18n.localize("PF2E.SpellLabel") : "";
            data.name = `${newLabel} ${levelLabel} ${spellLabel}`;
            mergeObject(data, {
                "system.level.value": data.level,
                "system.location.value": data.location,
            });
        } else if (data.type === "lore") {
            data.name =
                this.actor.type === "npc"
                    ? game.i18n.localize("PF2E.SkillLabel")
                    : game.i18n.localize("PF2E.NewPlaceholders.Lore");
        } else {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
        }

        this.actor.createEmbeddedDocuments("Item", [data]);
    }

    private onAddCoinsPopup(event: JQuery.ClickEvent) {
        event.preventDefault();
        new AddCoinsPopup(this.actor, {}).render(true);
    }

    private onRemoveCoinsPopup(event: JQuery.ClickEvent) {
        event.preventDefault();
        new RemoveCoinsPopup(this.actor, {}).render(true);
    }

    private onSellAllTreasure(event: JQuery.ClickEvent) {
        event.preventDefault();
        // Render confirmation modal dialog
        renderTemplate("systems/pf2e/templates/actors/sell-all-treasure-dialog.html").then((html) => {
            new Dialog({
                title: game.i18n.localize("PF2E.SellAllTreasureTitle"),
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: "Yes",
                        callback: async () => this.actor.inventory.sellAllTreasure(),
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                    },
                },
                default: "Yes",
            }).render(true);
        });
    }

    protected onTraitSelector(event: JQuery.ClickEvent) {
        event.preventDefault();
        const $anchor = $(event.currentTarget);
        const selectorType = $anchor.attr("data-tag-selector") ?? "";
        if (!tupleHasValue(TAG_SELECTOR_TYPES, selectorType)) {
            throw ErrorPF2e(`Unrecognized trait selector type "${selectorType}"`);
        }
        if (selectorType === "basic") {
            const objectProperty = $anchor.attr("data-property") ?? "";
            const title = $anchor.attr("data-title");
            const configTypes = ($anchor.attr("data-config-types") ?? "")
                .split(",")
                .map((type) => type.trim())
                .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
            this.tagSelector("basic", {
                objectProperty,
                configTypes,
                title,
            });
        } else {
            this.tagSelector(selectorType);
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
                resistances: ResistanceSelector,
                senses: SenseSelector,
                "speed-types": SpeedSelector,
                weaknesses: WeaknessSelector,
            }[selectorType];
            new TagSelector(this.object, options).render(true);
        }
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
    protected override async _renderInner(data: Record<string, unknown>, options: RenderOptions) {
        return this.itemRenderer.saveAndRestoreState(() => {
            return super._renderInner(data, options);
        });
    }

    /** Overriden _render to maintain focus on tagify elements */
    protected override async _render(force?: boolean, options?: RenderOptions): Promise<void> {
        await maintainTagifyFocusInRender(this, () => super._render(force, options));
    }

    /** Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error */
    protected override async _onSubmit(
        event: Event,
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        const $form = $<HTMLFormElement>(this.form);
        $form.find<HTMLInputElement>("tags ~ input").each((_i, input) => {
            if (input.value === "") input.value = "[]";
        });

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
