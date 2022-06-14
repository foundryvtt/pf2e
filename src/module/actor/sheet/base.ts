import { CharacterPF2e, NPCPF2e } from "@actor";
import { ItemPF2e, PhysicalItemPF2e, SpellcastingEntryPF2e, SpellPF2e, TreasurePF2e } from "@item";
import { ItemSourcePF2e, SpellcastingEntrySource } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables";
import {
    BasicConstructorOptions,
    TagSelectorBasic,
    ResistanceSelector,
    SenseSelector,
    SpeedSelector,
    WeaknessSelector,
    TagSelectorType,
    TAG_SELECTOR_TYPES,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TagSelectorOptions,
} from "@system/tag-selector";
import { ErrorPF2e, objectHasKey, tupleHasValue } from "@util";
import { LocalizePF2e } from "@system/localize";
import type { ActorPF2e } from "../base";
import { ActorSheetDataPF2e, CoinageSummary, InventoryItem, SheetInventory } from "./data-types";
import { MoveLootPopup } from "./loot/move-loot-popup";
import { AddCoinsPopup } from "./popups/add-coins-popup";
import { IdentifyItemPopup } from "./popups/identify-popup";
import { RemoveCoinsPopup } from "./popups/remove-coins-popup";
import { ScrollWandPopup } from "./popups/scroll-wand-popup";
import { SaveType } from "@actor/data";
import { RollFunction } from "@actor/data/base";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data";
import { FolderPF2e } from "@module/folder";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { createSpellcastingDialog } from "./spellcasting-dialog";
import { ItemSummaryRendererPF2e } from "./item-summary-renderer";
import { eventToRollParams } from "@scripts/sheet-util";
import { CreaturePF2e } from "@actor/creature";
import { createSheetTags } from "@module/sheet/helpers";
import { RollOptionRuleElement } from "@module/rules/rule-element/roll-option";
import { SpellPreparationSheet } from "@item/spellcasting-entry/sheet";
import { Coins } from "@item/physical/data";
import { DENOMINATIONS } from "@item/physical/values";

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
export abstract class ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.dragDrop.push({ dragSelector: ".drag-handle" }, { dragSelector: ".item[draggable=true]" });
        return mergeObject(options, {
            classes: options.classes.concat(["pf2e", "actor"]),
            scrollY: [".sheet-sidebar", ".tab.active", "ol.inventory-list"],
        });
    }

    /** Implementation used to handle the toggling and rendering of item summaries */
    itemRenderer: ItemSummaryRendererPF2e<TActor> = new ItemSummaryRendererPF2e(this);

    /** Can non-owning users loot items from this sheet? */
    get isLootSheet(): boolean {
        return false;
    }

    override async getData(options: ActorSheetOptions = this.options): Promise<ActorSheetDataPF2e<TActor>> {
        options.id ||= this.id;
        // The Actor and its Items
        const actorData = this.actor.data.toObject(false);

        const items = deepClone(
            this.actor.items.map((item) => item.data).sort((a, b) => (a.sort || 0) - (b.sort || 0))
        );
        (actorData as { items: unknown }).items = items;

        // Calculate financial and total wealth
        const coins = this.actor.inventory.coins;
        const totalCoinage = ActorSheetPF2e.coinsToSheetData(coins);
        const totalCoinageGold = (coins.copperValue / 100).toFixed(2);

        const totalWealth = this.actor.inventory.totalWealth;
        const totalWealthGold = (totalWealth.copperValue / 100).toFixed(2);

        // IWR
        const immunities = createSheetTags(CONFIG.PF2E.immunityTypes, actorData.data.traits.di);
        for (const weakness of actorData.data.traits.dv) {
            weakness.label = CONFIG.PF2E.weaknessTypes[weakness.type];
        }
        for (const resistance of actorData.data.traits.dr) {
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
            data: actorData.data,
            effects: actorData.effects,
            items: items,
            user: { isGM: game.user.isGM },
            traits: createSheetTags(traitsMap, actorData.data.traits.traits),
            immunities,
            hasImmunities: Object.keys(immunities).length > 0,
            isTargetFlatFooted: !!this.actor.rollOptions.all["target:condition:flat-footed"],
            totalCoinage,
            totalCoinageGold,
            totalWealth,
            totalWealthGold,
            inventory: this.prepareInventory(),
        };

        this.prepareItems(sheetData);

        return sheetData;
    }

    protected abstract prepareItems(sheetData: ActorSheetDataPF2e<TActor>): void;

    protected prepareInventory(): SheetInventory {
        const invested = this.actor.inventory.invested;
        const sections: SheetInventory["sections"] = {
            weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), type: "weapon", items: [] },
            armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), type: "armor", items: [] },
            equipment: {
                label: game.i18n.localize("PF2E.InventoryEquipmentHeader"),
                type: "equipment",
                items: [],
                invested,
            },
            consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), type: "consumable", items: [] },
            treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), type: "treasure", items: [] },
            backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), type: "backpack", items: [] },
        };

        const createInventoryItem = (item: PhysicalItemPF2e): InventoryItem => {
            const editable = game.user.isGM || item.isIdentified;
            const heldItems = item.isOfType("backpack") ? item.contents.map((i) => createInventoryItem(i)) : undefined;
            heldItems?.sort((a, b) => (a.item.data.sort || 0) - (b.item.data.sort || 0));

            return {
                item: item,
                editable,
                isContainer: item.isOfType("backpack"),
                canBeEquipped: !item.isInContainer,
                isInvestable:
                    this.actor.isOfType("character") &&
                    item.isEquipped &&
                    item.isIdentified &&
                    item.isInvested !== null,
                isSellable: editable && item.isOfType("treasure") && !item.isCoinage,
                hasCharges: item.isOfType("consumable") && item.charges.max > 0,
                heldItems,
            };
        };

        for (const item of this.actor.inventory.contents.sort((a, b) => (a.data.sort || 0) - (b.data.sort || 0))) {
            if (!objectHasKey(sections, item.type) || item.isInContainer) continue;
            const category = item.isOfType("book") ? sections.equipment : sections[item.type];
            category.items.push(createInventoryItem(item));
        }

        sections.equipment.overInvested = !!invested && invested.max < invested.value;
        return { sections, bulk: this.actor.inventory.bulk };
    }

    protected findActiveList() {
        return (this.element as JQuery).find(".tab.active .directory-list");
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

    /** Save any open tinyMCE editor before closing */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        const editors = Object.values(this.editors).filter((editor) => editor.active);
        for (const editor of editors) {
            editor.options.save_onsavecallback();
        }
        await super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Pad field width
        $html.find("[data-wpad]").each((_i, e) => {
            const text = e.tagName === "INPUT" ? (e as HTMLInputElement).value : e.innerText;
            const w = (text.length * Number(e?.getAttribute("data-wpad"))) / 2;
            e.setAttribute("style", `flex: 0 0 ${w}px`);
        });

        // Item summaries
        this.itemRenderer.activateListeners($html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        /* -------------------------------------------- */
        /*  Attributes, Skills, Saves and Traits        */
        /* -------------------------------------------- */

        if (!["character", "npc"].includes(this.actor.type)) InlineRollLinks.listen($html);

        // Roll Save Checks
        $html.find(".save-name").on("click", (event) => {
            event.preventDefault();
            const saveType = $(event.currentTarget).closest("[data-save]")[0].getAttribute("data-save") as SaveType;
            const save = this.actor.saves?.[saveType];
            if (save) {
                save.check.roll(eventToRollParams(event));
            } else {
                this.actor.rollSave(event, saveType);
            }
        });

        $html.find(".roll-init").on("click", (event) => {
            const $target = $(event.currentTarget);
            const { attributes } = this.actor.data.data;
            if (!$target.hasClass("disabled") && "initiative" in attributes) {
                const { skipDialog, secret } = eventToRollParams(event);
                const options = secret ? ["secret"] : [];
                attributes.initiative.roll?.({ skipDialog, options });
            }
        });

        const toggleSelector = "input[type=checkbox][data-action=toggle-roll-option]";
        $html.find<HTMLInputElement>(toggleSelector).on("change", async (event) => {
            const { domain, option, itemId } = event.target.dataset;
            if (domain && option) {
                const value = !!event.target.checked;
                await RollOptionRuleElement.toggleOption({
                    domain,
                    option,
                    actor: this.actor,
                    itemId: itemId ?? null,
                    value,
                });
            }
        });

        // Roll Attribute Checks
        $html.find(".attribute-name").on("click", (event) => {
            event.preventDefault();
            const key = event.currentTarget.parentElement?.getAttribute("data-attribute") || "";
            const isSecret = event.currentTarget.getAttribute("data-secret");
            const attributes: object = this.actor.data.data.attributes;
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

        // Remove Spell Slot
        $html.find(".item-unprepare").on("click", (event) => {
            const spellLvl = Number($(event.currentTarget).parents(".item").attr("data-spell-lvl") ?? 0);
            const slotId = Number($(event.currentTarget).parents(".item").attr("data-slot-id") ?? 0);
            const entryId = $(event.currentTarget).parents(".item").attr("data-entry-id") ?? "";
            const entry = this.actor.spellcasting.get(entryId);
            if (entry) {
                entry.unprepareSpell(spellLvl, slotId);
            }
        });

        // Set Expended Status of Spell Slot
        $html.find(".item-toggle-prepare").on("click", (event) => {
            const slotId = Number($(event.currentTarget).parents(".item").attr("data-slot-id") ?? 0);
            const spellLvl = Number($(event.currentTarget).parents(".item").attr("data-spell-lvl") ?? 0);
            const entryId = $(event.currentTarget).parents(".item").attr("data-entry-id") ?? "";
            const expendedState = ((): boolean => {
                const expendedString = $(event.currentTarget).parents(".item").attr("data-expended-state") ?? "";
                return expendedString !== "true";
            })();
            const entry = this.actor.spellcasting.get(entryId);
            if (entry) {
                entry.setSlotExpendedState(spellLvl, slotId, expendedState);
            }
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
        $html.find(".trait-selector").on("click", (event) => this.onTraitSelector(event));

        $html.find(".add-coins-popup button").on("click", (event) => this.onAddCoinsPopup(event));

        $html.find(".remove-coins-popup button").on("click", (event) => this.onRemoveCoinsPopup(event));

        $html.find(".sell-all-treasure button").on("click", (event) => this.onSellAllTreasure(event));

        // Inventory Browser
        $html.find(".inventory-browse").on("click", (event) => this.onClickBrowseEquipmentCompendia(event));

        const $spellcasting = $html.find(".tab.spellcasting, .tab.spells");
        const $spellControls = $spellcasting.find(".item-control");
        // Spell Create
        $spellControls.filter(".spell-create").on("click", (event) => this.onClickCreateItem(event));

        // Adding/Editing/Removing Spellcasting entries
        $spellcasting
            .find("[data-action=spellcasting-create]")
            .on("click", (event) => this.createSpellcastingEntry(event));
        $spellControls
            .filter("a[data-action=spellcasting-edit]")
            .on("click", (event) => this.editSpellcastingEntry(event));
        $spellControls
            .filter("a[data-action=spellcasting-remove]")
            .on("click", (event) => this.removeSpellcastingEntry(event));

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
            if (item instanceof TreasurePF2e && !item.isCoinage) {
                await item.delete();
                await this.actor.inventory.addCoins(item.assetValue);
            }
        });

        // Update an embedded item
        $html.find(".item-edit").on("click", (event) => {
            const itemId = $(event.currentTarget).closest("[data-item-id]").attr("data-item-id");
            const item = this.actor.items.get(itemId ?? "");
            if (item) {
                item.sheet.render(true);
            }
        });

        // Toggle identified
        $html.find(".item-toggle-identified").on("click", (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents(".item").attr("data-item-id") ?? "";
            const identified = f.hasClass("identified");
            if (identified) {
                const item = this.actor.items.get(itemId);
                if (!(item instanceof PhysicalItemPF2e)) {
                    throw ErrorPF2e(`${itemId} is not a physical item.`);
                }
                item.setIdentificationStatus("unidentified");
            } else {
                const item = this.actor.items.get(itemId);
                if (item instanceof PhysicalItemPF2e) {
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
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error("PF2e System | Tried to update quantity on item that does not have quantity");
            }
            this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "data.quantity": item.quantity + 1 }]);
        });

        // Decrease Item Quantity
        $html.find(".item-decrease-quantity").on("click", (event) => {
            const li = $(event.currentTarget).parents(".item");
            const itemId = li.attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw ErrorPF2e("Tried to update quantity on item that does not have quantity");
            }
            if (item.quantity > 0) {
                this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "data.quantity": item.quantity - 1 }]);
            }
        });

        // Item Rolling
        $html.find(".item[data-item-id] .item-image").on("click", (event) => this.onClickItemToChat(event));

        // Delete Formula
        $html.find(".formula-delete").on("click", (event) => {
            event.preventDefault();

            const itemUuid = $(event.currentTarget).parents(".item").attr("data-item-id");
            if (!itemUuid) return;

            if (this.actor instanceof CharacterPF2e) {
                const actorFormulas = this.actor.data.toObject().data.crafting.formulas ?? [];
                actorFormulas.findSplice((f) => f.uuid === itemUuid);
                this.actor.update({ "data.crafting.formulas": actorFormulas });
            }
        });

        // Modify select element
        $html.find<HTMLSelectElement>(".ability-select").on("change", async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            await this.actor.updateEmbeddedDocuments("Item", [
                {
                    _id: itemId,
                    "data.ability.value": event.target.value,
                },
            ]);
        });

        // Update max slots for Spell Items
        $html.find(".prepared-toggle").on("click", async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            this.openSpellPreparationSheet(itemId);
        });

        $html.find(".slotless-level-toggle").on("click", async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            const itemToEdit = this.actor.items.get(itemId)?.data;
            if (itemToEdit?.type !== "spellcastingEntry")
                throw new Error("Tried to toggle visibility of slotless levels on a non-spellcasting entry");
            const bool = !(itemToEdit.data.showSlotlessLevels || {}).value;

            await this.actor.updateEmbeddedDocuments("Item", [
                {
                    _id: itemId ?? "",
                    "data.showSlotlessLevels.value": bool,
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

    /** Opens the spell preparation sheet, but only if its a prepared entry */
    openSpellPreparationSheet(entryId: string) {
        const entry = this.actor.items.get(entryId);
        if (entry instanceof SpellcastingEntryPF2e && entry.isPrepared) {
            const $book = this.element.find(`.item-container[data-container-id="${entry.id}"] .prepared-toggle`);
            const offset = $book.offset() ?? { left: 0, top: 0 };
            const sheet = new SpellPreparationSheet(entry, { top: offset.top - 60, left: offset.left + 200 });
            sheet.render(true);
        }
    }

    async onClickDeleteItem(event: JQuery.TriggeredEvent): Promise<void> {
        const $li = $(event.currentTarget).closest("li[data-item-id]");
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
        } else if (item instanceof ItemPF2e) {
            const deleteItem = async (): Promise<void> => {
                await item.delete();
                if (item.type === "lore") {
                    // normalize skill name to lower-case and dash-separated words
                    const skill = item.name.toLowerCase().replace(/\s+/g, "-");
                    // remove derived skill data
                    await this.actor.update({ [`data.skills.-=${skill}`]: null });
                } else {
                    // clean up any individually targeted modifiers to attack and damage
                    await this.actor.update({
                        [`data.customModifiers.-=${itemId}-attack`]: null,
                        [`data.customModifiers.-=${itemId}-damage`]: null,
                    });
                }
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

    private onClickBrowseEquipmentCompendia(event: JQuery.ClickEvent<HTMLElement>) {
        const filter: string[] = [$(event.currentTarget).attr("data-filter")].filter(
            (element): element is string => !!element
        );
        console.debug(`Filtering on: ${filter}`);
        game.pf2e.compendiumBrowser.openTab("equipment", filter);
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
        // Avoid intercepting entity-link drag targets
        if (event.target !== event.currentTarget && event.target.classList.contains("entity-link")) {
            return;
        }

        const $target = $(event.currentTarget);
        const $itemRef = $target.closest(".item");

        // Show a different drag/drop preview element and copy some data if this is a handle
        // This will make the preview nicer and also trick foundry into thinking the actual item started drag/drop
        const targetElement = $target.get(0);
        const previewElement = $itemRef.get(0);
        if (previewElement && targetElement && targetElement !== previewElement) {
            event.dataTransfer.setDragImage(previewElement, 0, 0);
            mergeObject(targetElement.dataset, previewElement.dataset);
        }

        const baseDragData: { [key: string]: unknown } = {
            actorId: this.actor.id,
            sceneId: canvas.scene?.id ?? null,
            tokenId: this.actor.token?.id ?? null,
        };

        // Owned Items
        const itemId = $itemRef.attr("data-item-id");
        const item = this.actor.items.get(itemId ?? "");
        if (item) {
            baseDragData.type = "Item";
            baseDragData.data = item.data;
        }

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
                    pf2e: {
                        type: "Action",
                        index: Number(actionIndex),
                    },
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

        return supplementalData
            ? event.dataTransfer.setData(
                  "text/plain",
                  JSON.stringify({
                      ...baseDragData,
                      ...supplementalData,
                  })
              )
            : super._onDragStart(event);
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(event: ElementDragEvent, itemSource: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const $dropItemEl = $(event.target).closest(".item");
        const $dropContainerEl = $(event.target).closest(".item-container");

        const dropSlotType = $dropItemEl.attr("data-item-type");
        const dropContainerType = $dropContainerEl.attr("data-container-type");
        const item = this.actor.items.get(itemSource._id);
        if (!item) return [];

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (item.isOfType("spell")) {
            const targetLocation = $dropContainerEl.attr("data-container-id") ?? "";
            const entry = this.actor.spellcasting.get(targetLocation);
            if (!entry) {
                console.warn("PF2E System | Failed to load spellcasting entry");
                return [];
            }

            if (dropSlotType === "spellLevel") {
                const { level } = $dropItemEl.data();
                const spell = await entry.addSpell(item, level);
                this.openSpellPreparationSheet(entry.id);
                return [spell ?? []].flat();
            } else if ($dropItemEl.attr("data-slot-id")) {
                const dropId = Number($dropItemEl.attr("data-slot-id"));
                const spellLvl = Number($dropItemEl.attr("data-spell-lvl"));

                if (Number.isInteger(dropId) && Number.isInteger(spellLvl)) {
                    const allocated = await entry.prepareSpell(item, spellLvl, dropId);
                    if (allocated) return [allocated];
                }
            } else if (dropSlotType === "spell") {
                const dropId = $dropItemEl.attr("data-item-id") ?? "";
                const target = this.actor.items.get(dropId);
                if (target?.isOfType("spell") && item.id !== dropId) {
                    const sourceLocation = item.data.data.location.value;

                    // Inner helper to test if two spells are siblings
                    const testSibling = (item: SpellPF2e, test: SpellPF2e) => {
                        if (item.isCantrip !== test.isCantrip) return false;
                        if (item.isCantrip && test.isCantrip) return true;
                        if (item.isFocusSpell && test.isFocusSpell) return true;
                        if (item.level === test.level) return true;
                        return false;
                    };

                    if (sourceLocation === targetLocation && testSibling(item, target)) {
                        const siblings = entry.spells.filter((spell) => testSibling(item, spell));
                        const sortBefore = item.data.sort >= target.data.sort;
                        await item.sortRelative({ target, siblings, sortBefore });
                        return [target];
                    } else {
                        const spell = await entry.addSpell(item, target.level);
                        this.openSpellPreparationSheet(entry.id);
                        return [spell ?? []].flat();
                    }
                }
            } else if (dropContainerType === "spellcastingEntry") {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks)
                    console.debug("PF2e System | ***** spell from same actor dropped on a spellcasting entry *****");

                const dropId = $(event.target).parents(".item-container").attr("data-container-id");
                return dropId ? [await item.update({ "data.location.value": dropId })] : [];
            }
        } else if (item.isOfType("spellcastingEntry")) {
            // target and source are spellcastingEntries and need to be sorted
            if (dropContainerType === "spellcastingEntry") {
                const sourceId = item.id;
                const dropId = $dropContainerEl.attr("data-container-id") ?? "";
                const source = this.actor.items.get(sourceId);
                const target = this.actor.items.get(dropId);

                if (source && target && source.id !== target.id) {
                    const siblings = this.actor.spellcasting.contents;
                    const sortBefore = source.data.sort >= target.data.sort;
                    source.sortRelative({ target, siblings, sortBefore });
                    return [target];
                }
            }
        } else if (item instanceof PhysicalItemPF2e) {
            const $target = $(event.target).closest("[data-item-id]");
            const targetId = $target.attr("data-item-id") ?? "";
            const target = this.actor.inventory.get(targetId);

            if (target && item.isStackableWith(target)) {
                const stackQuantity = item.quantity + target.quantity;
                if (await item.delete({ render: false })) {
                    await target.update({ "data.quantity": stackQuantity });
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
        }

        return super._onSortItem(event, itemSource);
    }

    protected override async _onDropItemCreate(itemSource: ItemSourcePF2e | ItemSourcePF2e[]): Promise<ItemPF2e[]> {
        const sources = Array.isArray(itemSource) ? itemSource : [itemSource];
        const pcOnlyItems = ["ancestry", "background", "class", "feat"];
        if (this.actor.type !== "character") {
            for (const datum of [...sources]) {
                if (pcOnlyItems.includes(datum.type)) {
                    ui.notifications.error(
                        game.i18n.format("PF2E.Item.CannotAddType", {
                            type: game.i18n.localize(CONFIG.Item.typeLabels[datum.type] ?? datum.type.titleCase()),
                        })
                    );
                    sources.findSplice((item) => item === datum);
                }
            }
        }
        return super._onDropItemCreate(sources);
    }

    async onDropItem(data: DropCanvasItemDataPF2e) {
        return await this._onDropItem({ preventDefault(): void {} } as ElementDragEvent, data);
    }

    /** Extend the base _onDropItem method to handle dragging spells onto spell slots. */
    protected override async _onDropItem(event: ElementDragEvent, data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        if (!item) return [];
        const itemSource = item.toObject();

        const actor = this.actor;
        const isSameActor = data.actorId === actor.id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) return this._onSortItem(event, itemSource);

        const sourceItemId = data.data?._id;
        if (data.actorId && isPhysicalData(itemSource) && typeof sourceItemId === "string") {
            await this.moveItemBetweenActors(
                event,
                data.actorId,
                data.tokenId ?? "",
                actor.id,
                actor.token?.id ?? "",
                sourceItemId
            );
            return [item];
        }

        // mystify the item if the alt key was pressed
        if (event.altKey && isPhysicalData(itemSource)) {
            itemSource.data.identification.unidentified = (item as PhysicalItemPF2e).getMystifiedData("unidentified");
            itemSource.data.identification.status = "unidentified";
        }

        // get the item type of the drop target
        const $itemEl = $(event.target).closest(".item");
        const $containerEl = $(event.target).closest(".item-container");
        const containerAttribute = $containerEl.attr("data-container-type");
        const unspecificInventory = this._tabs[0]?.active === "inventory" && !containerAttribute;
        const dropContainerType = unspecificInventory ? "actorInventory" : containerAttribute;
        const craftingTab = this._tabs[0]?.active === "crafting";

        // otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (item.isOfType("spell") && itemSource.type === "spell") {
            if (dropContainerType === "spellcastingEntry") {
                const entryId = $containerEl.attr("data-container-id") ?? "";
                const entry = this.actor.spellcasting.get(entryId);
                if (!entry) {
                    console.warn("PF2E System | Failed to load spellcasting entry");
                    return [];
                }

                const level = Math.max(Number($itemEl.attr("data-level")) || 0, item.baseLevel);
                this.openSpellPreparationSheet(entry.id);
                return [(await entry.addSpell(item, level)) ?? []].flat();
            } else if (dropContainerType === "actorInventory" && itemSource.data.level.value > 0) {
                const popup = new ScrollWandPopup(
                    this.actor,
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
            if (typeof value === "number" && itemSource.data.value.isValued) {
                itemSource.data.value.value = value;
            }
            const token = actor.token?.object
                ? actor.token.object
                : canvas.tokens.controlled.find((canvasToken) => canvasToken.actor?.id === actor.id);

            if (!actor.canUserModify(game.user, "update")) {
                const translations = LocalizePF2e.translations.PF2E;
                ui.notifications.error(translations.ErrorMessage.NoUpdatePermission);
                return [];
            } else if (token) {
                const condition = await game.pf2e.ConditionManager.addConditionToToken(itemSource, token);
                return condition ? [condition] : [];
            } else {
                await actor.increaseCondition(itemSource.data.slug, { min: itemSource.data.value.value });
                return [item];
            }
        } else if (itemSource.type === "effect" && data && "level" in data) {
            const level = data.level;
            if (typeof level === "number" && level >= 0) {
                itemSource.data.level.value = level;
            }
        } else if (item instanceof PhysicalItemPF2e && actor instanceof CharacterPF2e && craftingTab) {
            const actorFormulas = actor.data.toObject().data.crafting.formulas;
            if (!actorFormulas.some((f) => f.uuid === item.uuid)) {
                actorFormulas.push({ uuid: item.uuid });
                await actor.update({ "data.crafting.formulas": actorFormulas });
            }
            return [item];
        }

        if (isPhysicalData(itemSource)) {
            const containerId =
                $(event.target).closest('[data-item-is-container="true"]').attr("data-item-id")?.trim() || null;
            const container = this.actor.itemTypes.backpack.find((container) => container.id === containerId);
            if (container) {
                itemSource.data.containerId = containerId;
                itemSource.data.equipped.carryType = "stowed";
            } else {
                itemSource.data.equipped.carryType = "worn";
            }
            // If the item is from a compendium, adjust the size to be appropriate to the creature's
            const resizeItem =
                data.pack &&
                itemSource.type !== "treasure" &&
                !["med", "sm"].includes(actor.size) &&
                actor instanceof CreaturePF2e;
            if (resizeItem) itemSource.data.size = actor.size;
        }
        return this._onDropItemCreate(itemSource);
    }

    protected override async _onDropFolder(
        _event: ElementDragEvent,
        data: DropCanvasData<"Folder", FolderPF2e>
    ): Promise<ItemPF2e[]> {
        if (!(this.actor.isOwner && data.documentName === "Item")) return [];
        const folder = (await FolderPF2e.fromDropData(data)) as FolderPF2e<ItemPF2e> | undefined;
        if (!folder) return [];
        const itemSources = folder.flattenedContents.map((item) => item.toObject());
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
        if (!(item instanceof PhysicalItemPF2e)) {
            throw ErrorPF2e("Missing or invalid item");
        }

        const container = $(event.target).parents('[data-item-is-container="true"]');
        const containerId = container[0] !== undefined ? container[0].dataset.itemId?.trim() : undefined;
        const sourceItemQuantity = item.quantity;
        const stackable = !!targetActor.findStackableItem(targetActor, item.data._source);
        // If more than one item can be moved, show a popup to ask how many to move
        if (sourceItemQuantity > 1) {
            const popup = new MoveLootPopup(
                sourceActor,
                { maxQuantity: sourceItemQuantity, lockStack: !stackable },
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
        const item = this.actor.items.get(itemId ?? "");
        await item?.toChat(event);
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

        const isCollapsed = item.data.data.collapsed ?? false;
        await item.update({ "data.collapsed": !isCollapsed });
    }

    /** Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset */
    private onClickCreateItem(event: JQuery.ClickEvent) {
        event.preventDefault();
        const header = event.currentTarget;
        const data: any = duplicate(header.dataset);
        data.img = `systems/pf2e/icons/default-icons/${data.type}.svg`;

        if (data.type === "action") {
            const newLabel = game.i18n.localize("PF2E.NewLabel");
            const actionTypeLabel = game.i18n.localize(`PF2E.ActionType${data.actionType.capitalize()}`);
            data.name = `${newLabel} ${actionTypeLabel}`;
            mergeObject(data, { "data.actionType.value": data.actionType });
        } else if (data.type === "melee") {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
            mergeObject(data, { "data.weaponType.value": data.actionType });
        } else if (data.type === "spell") {
            data.level = Number(data.level ?? 1);
            const newLabel = game.i18n.localize("PF2E.NewLabel");
            const levelLabel = game.i18n.localize(`PF2E.SpellLevel${data.level}`);
            const spellLabel = data.level > 0 ? game.i18n.localize("PF2E.SpellLabel") : "";
            data.name = `${newLabel} ${levelLabel} ${spellLabel}`;
            mergeObject(data, {
                "data.level.value": data.level,
                "data.location.value": data.location,
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

    /** Handle creating a new spellcasting entry for the actor */
    private createSpellcastingEntry(event: JQuery.ClickEvent) {
        event.preventDefault();
        createSpellcastingDialog(event, {
            callback: (result) => {
                const { spellcastingType, tradition, ability, flexible } = result;

                const name =
                    spellcastingType === "ritual"
                        ? game.i18n.localize(CONFIG.PF2E.preparationType["ritual"])
                        : game.i18n.format("PF2E.SpellCastingFormat", {
                              preparationType: game.i18n.localize(CONFIG.PF2E.preparationType[spellcastingType] ?? ""),
                              traditionSpells: game.i18n.format(`PF2E.TraditionSpells.${tradition.titleCase()}`, {
                                  tradition: game.i18n.localize(CONFIG.PF2E.magicTraditions[tradition || "arcane"]),
                              }),
                          });

                // Define new spellcasting entry
                const actor = this.actor;
                if (!(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) return;

                const data: PreCreate<SpellcastingEntrySource> = {
                    name,
                    type: "spellcastingEntry",
                    data: {
                        ability: { value: ability },
                        spelldc: { value: 0, dc: 0, mod: 0 },
                        tradition: { value: tradition },
                        prepared: { value: spellcastingType, flexible: flexible ?? undefined },
                    },
                };

                this.actor.createEmbeddedDocuments("Item", [data]);
            },
        });
    }

    private editSpellcastingEntry(event: JQuery.ClickEvent): void {
        const { containerId } = $(event.target).closest("[data-container-id]").data();
        const entry = this.actor.spellcasting.get(containerId);
        if (!entry) {
            console.warn("PF2E System | Failed to load spellcasting entry");
            return;
        }

        createSpellcastingDialog(event, {
            entry,
            callback: (result) => {
                entry.update({
                    "data.tradition.value": result.tradition,
                    "data.ability.value": result.ability,
                    "data.prepared.flexible": result.flexible,
                });
            },
        });
    }

    /**
     * Handle removing an existing spellcasting entry for the actor
     */
    private removeSpellcastingEntry(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const li = $(event.currentTarget).parents("[data-container-id]");
        const itemId = li.attr("data-container-id") ?? "";
        const item = this.actor.items.get(itemId);
        if (!item) {
            return;
        }

        // Render confirmation modal dialog
        renderTemplate("systems/pf2e/templates/actors/delete-spellcasting-dialog.html").then((html) => {
            new Dialog({
                title: "Delete Confirmation",
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: "Yes",
                        callback: async () => {
                            console.debug("PF2e System | Deleting Spell Container: ", item.name);
                            // Delete all child objects
                            const itemsToDelete: string[] = [];
                            for (const item of this.actor.itemTypes.spell) {
                                if (item.data.data.location.value === itemId) {
                                    itemsToDelete.push(item.id);
                                }
                            }
                            // Delete item container
                            itemsToDelete.push(item.id);
                            await this.actor.deleteEmbeddedDocuments("Item", itemsToDelete);

                            li.slideUp(200, () => this.render(false));
                        },
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
        const selectorType = $anchor.attr("data-trait-selector") ?? "";
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

    protected override _getSubmitData(updateData?: DocumentUpdateData<TActor>): Record<string, unknown> {
        const data = super._getSubmitData(updateData);

        // Use delta values for inputs that have `data-allow-delta` if input value starts with + or -
        for (const el of Array.from(this.form.elements)) {
            if (el instanceof HTMLInputElement && el.dataset.allowDelta !== undefined) {
                const strValue = el.value.trim();
                const value = Number(strValue);
                if ((strValue.startsWith("+") || strValue.startsWith("-")) && !Number.isNaN(value))
                    data[el.name] = getProperty(this.actor.data, el.name) + value;
            }
        }

        return data;
    }
}
