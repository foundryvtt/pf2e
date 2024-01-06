import type { ActorPF2e, CreaturePF2e } from "@actor";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { createSpellcastingDialog } from "@actor/sheet/spellcasting-dialog.ts";
import { SpellcastingEntryPF2e, type ItemPF2e, type SpellPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ITEM_CARRY_TYPES } from "@item/base/data/values.ts";
import { coerceToSpellGroupId, spellSlotGroupIdToNumber } from "@item/spellcasting-entry/helpers.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { OneToTen, ZeroToFour, goesToEleven } from "@module/data.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { ErrorPF2e, fontAwesomeIcon, htmlClosest, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import { ActorSheetPF2e, SheetClickActionHandlers } from "../sheet/base.ts";
import { CreatureConfig } from "./config.ts";
import { Language } from "./index.ts";
import { SpellPreparationSheet } from "./spell-preparation-sheet.ts";

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
abstract class CreatureSheetPF2e<TActor extends CreaturePF2e> extends ActorSheetPF2e<TActor> {
    /** A DocumentSheet class presenting additional, per-actor settings */
    protected abstract readonly actorConfigClass: ConstructorOf<CreatureConfig<CreaturePF2e>> | null;

    override async getData(options?: Partial<ActorSheetOptions>): Promise<CreatureSheetData<TActor>> {
        const sheetData = (await super.getData(options)) as CreatureSheetData<TActor>;
        const actor = this.actor;

        // Languages for PCs are handled in the PC sheet subclass
        const languages = actor.isOfType("character")
            ? []
            : actor.system.details.languages.value
                  .filter((l) => l in CONFIG.PF2E.languages)
                  .map((slug) => ({ slug, label: game.i18n.localize(CONFIG.PF2E.languages[slug] ?? slug) }))
                  .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

        return {
            ...sheetData,
            languages,
            actorSizes: CONFIG.PF2E.actorSizes,
            rarity: CONFIG.PF2E.rarityTraits,
            frequencies: CONFIG.PF2E.frequencies,
            pfsFactions: CONFIG.PF2E.pfsFactions,
            dying: {
                maxed: actor.attributes.dying.value >= actor.attributes.dying.max,
                remainingDying: Math.max(actor.attributes.dying.max - actor.attributes.dying.value),
                remainingWounded: Math.max(actor.attributes.wounded.max - actor.attributes.wounded.value),
            },
        };
    }

    /** Opens the spell preparation sheet, but only if its a prepared entry */
    #openSpellPreparation(collectionId: string, event?: DragEvent | MouseEvent): void {
        const entry = this.actor.items.get(collectionId, { strict: true });
        if (entry?.isOfType("spellcastingEntry") && entry.isPrepared) {
            const referenceEl = htmlClosest(event?.target, "[data-action=open-spell-preparation]");
            const offset = referenceEl ? $(referenceEl).offset() ?? { left: 0, top: 0 } : null;
            const options = offset ? { top: offset.top - 60, left: offset.left + 200 } : {};
            const sheet = new SpellPreparationSheet(entry, options);
            sheet.render(true);
        }
    }

    protected async prepareSpellcasting(): Promise<SpellcastingSheetData[]> {
        const entries = await Promise.all(this.actor.spellcasting.map(async (entry) => entry.getSheetData()));
        return entries.sort((a, b) => a.sort - b.sort);
    }

    /** Get the font-awesome icon used to display a certain level of skill proficiency */
    protected getProficiencyIcon(level: ZeroToFour): string {
        return [...Array(level)].map(() => fontAwesomeIcon("check-circle").outerHTML).join("");
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Change carry type
        const carryMenuListener = (event: MouseEvent) => {
            if (!(event.currentTarget instanceof HTMLElement)) {
                throw ErrorPF2e("Unexpected error retrieving carry-type link");
            }
            const menu = event.currentTarget;
            const toggle = menu.nextElementSibling;
            if (toggle?.classList.contains("carry-type-hover")) {
                $(toggle).tooltipster("close");
            }

            const carryType = menu.dataset.carryType;
            if (!setHasElement(ITEM_CARRY_TYPES, carryType)) {
                throw ErrorPF2e("Unexpected error retrieving requested carry type");
            }

            const itemId = htmlClosest(menu, "[data-item-id]")?.dataset.itemId;
            const item = this.actor.inventory.get(itemId, { strict: true });

            const handsHeld = Number(menu.dataset.handsHeld) || 0;
            if (!tupleHasValue([0, 1, 2], handsHeld)) {
                throw ErrorPF2e("Invalid number of hands specified");
            }

            const inSlot = menu.dataset.inSlot === "true";
            const current = item.system.equipped;
            if (
                carryType !== current.carryType ||
                inSlot !== current.inSlot ||
                (carryType === "held" && handsHeld !== current.handsHeld)
            ) {
                this.actor.adjustCarryType(item, { carryType, handsHeld, inSlot });
            }
        };
        for (const carryTypeMenu of htmlQueryAll(html, ".tab.inventory a[data-carry-type]")) {
            carryTypeMenu.addEventListener("click", carryMenuListener);
        }

        // General handler for embedded item updates
        const selectors = "input[data-item-id][data-item-property], select[data-item-id][data-item-property]";
        $html.find(selectors).on("change", (event) => {
            const $target = $(event.target);

            const { itemId, itemProperty } = event.target.dataset;
            if (!itemId || !itemProperty) return;

            const value = (() => {
                const value = $(event.target).val();
                if (typeof value === "undefined" || value === null) {
                    return value;
                }

                const dataType =
                    $target.attr("data-dtype") ??
                    ($target.attr("type") === "checkbox"
                        ? "Boolean"
                        : ["number", "range"].includes($target.attr("type") ?? "")
                          ? "Number"
                          : "String");

                switch (dataType) {
                    case "Boolean":
                        return typeof value === "boolean" ? value : value === "true";
                    case "Number":
                        return Number(value);
                    case "String":
                        return String(value);
                    default:
                        return value;
                }
            })();

            this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, [itemProperty]: value }]);
        });

        // Toggle Dying or Wounded
        $html.find(".dots.dying, .dots.wounded").on("click contextmenu", (event) => {
            type ConditionName = "dying" | "wounded";
            const condition = Array.from(event.delegateTarget.classList).find((className): className is ConditionName =>
                ["dying", "wounded"].includes(className),
            );
            if (condition) {
                const currentMax = this.actor.system.attributes[condition]?.max;
                if (event.type === "click" && currentMax) {
                    this.actor.increaseCondition(condition, { max: currentMax });
                } else if (event.type === "contextmenu") {
                    this.actor.decreaseCondition(condition);
                }
            }
        });

        // We can't use form submission for these updates since duplicates force array updates.
        // We'll have to move focus points to the top of the sheet to remove this
        $html.find(".focus-pool").on("change", (event) => {
            this.actor.update({ "system.resources.focus.max": $(event.target).val() });
        });
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);

        handlers["perception-check"] = async (event, anchor) => {
            const extraRollOptions = anchor.dataset.secret ? ["secret"] : [];
            await this.actor.perception.roll({ ...eventToRollParams(event, { type: "check" }), extraRollOptions });
        };

        handlers["recovery-check"] = async (event) => {
            await this.actor.rollRecovery(event);
        };

        // SPELLCASTING

        // Casting spells and consuming slots or focus points
        handlers["cast-spell"] = async (event) => {
            const spellRow = htmlClosest(event.target, "[data-item-id]");
            const { itemId, entryId, slotId } = spellRow?.dataset ?? {};
            const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });
            const spell = collection.get(itemId, { strict: true });
            const maybeCastRank = Number(spellRow?.dataset.castRank) || NaN;
            if (Number.isInteger(maybeCastRank) && maybeCastRank.between(1, 10)) {
                const rank = maybeCastRank as OneToTen;
                return collection.entry.cast(spell, { rank, slotId: Number(slotId) });
            }
        };

        handlers["browse-spells"] = (_, anchor) => {
            this.#onClickBrowseSpells(anchor);
        };

        handlers["open-spell-preparation"] = (event) => {
            const collectionId = htmlClosest(event.target, "[data-container-id]")?.dataset.containerId;
            if (!collectionId) throw ErrorPF2e("Unexpected failure looking up spell collection");
            this.#openSpellPreparation(collectionId, event);
        };

        // Empty spell slot
        handlers["unprepare-spell"] = (event) => {
            const row = htmlClosest(event.target, "[data-item-id]");
            const groupId = coerceToSpellGroupId(row?.dataset.groupId);
            if (!groupId) throw ErrorPF2e("Unexpected slot group ID");

            const slotId = Number(row?.dataset.slotId) || 0;
            const entryId = row?.dataset.entryId ?? "";
            const collection = this.actor.spellcasting.collections.get(entryId);
            collection?.unprepareSpell(groupId, slotId);
        };

        // Set expended state of a spell slot
        handlers["toggle-slot-expended"] = (event) => {
            const row = htmlClosest(event.target, "[data-item-id]");
            const groupId = coerceToSpellGroupId(row?.dataset.groupId);
            if (!groupId) throw ErrorPF2e("Unexpected error toggling expended state");

            const slotId = Number(row?.dataset.slotId) || 0;
            const entryId = row?.dataset.entryId ?? "";
            const expend = row?.dataset.slotExpended === undefined;
            const collection = this.actor.spellcasting.collections.get(entryId);

            collection?.setSlotExpendedState(groupId, slotId, expend);
        };

        handlers["toggle-signature-spell"] = async (event) => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const spell = this.actor.items.get(itemId, { strict: true });
            if (!spell?.isOfType("spell")) return;
            spell.update({ "system.location.signature": !spell.system.location.signature });
        };

        handlers["toggle-show-slotless-ranks"] = async (event) => {
            const collectionId = htmlClosest(event.target, "[data-container-id]")?.dataset.containerId;
            const spellcastingEntry = this.actor.items.get(collectionId, { strict: true });
            if (!spellcastingEntry.isOfType("spellcastingEntry")) {
                throw ErrorPF2e("Tried to toggle visibility of slotless ranks on a non-spellcasting entry");
            }
            await spellcastingEntry.update({
                "system.showSlotlessLevels.value": !spellcastingEntry.showSlotlessRanks,
            });
        };

        // Regenerating spell slots and spell uses
        handlers["reset-spell-slots"] = async (event) => {
            const actor = this.actor;
            const row = htmlClosest(event.target, "[data-item-id]");
            const itemId = row?.dataset.itemId;
            const item = actor.items.get(itemId, { strict: true });

            if (item.isOfType("spellcastingEntry")) {
                const { system } = item.toObject();
                if (!system.slots) return;
                const groupNumber = spellSlotGroupIdToNumber(row?.dataset.groupId) || 0;
                const propertyKey = goesToEleven(groupNumber) ? (`slot${groupNumber}` as const) : "slot0";
                system.slots[propertyKey].value = system.slots[propertyKey].max;
                await item.update({ system });
            } else if (item.isOfType("spell")) {
                const max = item.system.location.uses?.max;
                if (!max) return;
                await item.update({ "system.location.uses.value": max });
            }
        };

        // Spellcasting entries

        // Add, edit, and remove spellcasting entries
        handlers["spellcasting-create"] = async (event) => {
            await createSpellcastingDialog(event, this.actor);
        };
        handlers["spellcasting-edit"] = async (event) => {
            const containerId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const entry = this.actor.items.get(containerId, { strict: true });
            if (entry.isOfType("spellcastingEntry")) {
                await createSpellcastingDialog(event, entry);
            }
        };
        handlers["spellcasting-remove"] = async (event) => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const item = this.actor.items.get(itemId, { strict: true });
            const title = game.i18n.localize("PF2E.DeleteSpellcastEntryTitle");
            const content = await renderTemplate("systems/pf2e/templates/actors/delete-spellcasting-dialog.hbs");

            // Render confirmation modal dialog
            if (await Dialog.confirm({ title, content })) {
                await item.delete();
            }
        };

        return handlers;
    }

    /** Adds support for moving spells between spell levels, spell collections, and spell preparation */
    protected override async _onSortItem(event: DragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const dropItemEl = htmlClosest(event.target, "[data-item-id]");
        const dropContainerEl = htmlClosest(event.target, "[data-container-id]");
        const dropSlotType = dropItemEl?.dataset.itemType;
        const dropContainerType = dropContainerEl?.dataset.containerType;

        const item = this.actor.items.get(itemData._id!);
        if (!item) return [];

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (item.isOfType("spell")) {
            if (!(dropItemEl && dropContainerEl)) return [];
            const entryId = dropContainerEl.dataset.containerId;
            const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });
            const groupId = coerceToSpellGroupId(dropItemEl.dataset.groupId);

            if (dropSlotType === "spell-slot-group") {
                const spell = await collection.addSpell(item, { groupId });
                this.#openSpellPreparation(collection.id);
                return [spell ?? []].flat();
            } else if (dropItemEl.dataset.slotId) {
                const slotId = Number(dropItemEl.dataset.slotId ?? NaN);

                if (groupId && Number.isInteger(slotId)) {
                    const allocated = await collection.prepareSpell(item, groupId, slotId);
                    if (allocated instanceof SpellcastingEntryPF2e) return [allocated];
                }
            } else if (dropSlotType === "spell") {
                const dropId = dropItemEl.dataset.itemId ?? "";
                const target = this.actor.items.get(dropId);
                if (target?.isOfType("spell") && item.id !== dropId) {
                    const sourceLocation = item.system.location.value;

                    // Inner helper to test if two spells are siblings
                    const testSibling = (item: SpellPF2e, test: SpellPF2e) => {
                        if (item.isCantrip !== test.isCantrip) return false;
                        if (item.isCantrip && test.isCantrip) return true;
                        if (item.isFocusSpell && test.isFocusSpell) return true;
                        if (item.rank === test.rank) return true;
                        return false;
                    };

                    if (sourceLocation === entryId && testSibling(item, target)) {
                        const siblings = collection.filter((s) => testSibling(item, s));
                        await item.sortRelative({ target, siblings });
                        return [target];
                    } else {
                        const spell = await collection.addSpell(item, { groupId: target.rank });
                        this.#openSpellPreparation(collection.id);
                        return [spell ?? []].flat();
                    }
                }
            } else if (dropContainerType === "spellcastingEntry") {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks) {
                    console.debug("PF2e System | ***** spell from same actor dropped on a spellcasting entry *****");
                }

                const dropId = htmlClosest(event.target, "li[data-container-id]")?.dataset.containerId;
                const updated = dropId ? await item.update({ "system.location.value": dropId }) : null;
                return updated ? [updated] : [];
            }
        } else if (item.isOfType("spellcastingEntry") && dropContainerType === "spellcastingEntry") {
            // target and source are spellcastingEntries and need to be sorted
            const sourceId = item.id;
            const dropId = dropContainerEl?.dataset.containerId ?? "";
            const source = this.actor.items.get(sourceId);
            const target = this.actor.items.get(dropId);

            if (
                source?.isOfType("spellcastingEntry") &&
                target?.isOfType("spellcastingEntry") &&
                source.id !== target.id
            ) {
                const siblings = this.actor.itemTypes.spellcastingEntry;
                await source.sortRelative({ target, siblings });
                return [source];
            }
        }

        return super._onSortItem(event, itemData);
    }

    /** Handle dragging spells onto spell slots. */
    protected override async _handleDroppedItem(
        event: DragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: DropCanvasItemDataPF2e,
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const containerEl = htmlClosest(event.target, "[data-container-type=spellcastingEntry]");
        if (containerEl && item.isOfType("spell") && !item.isRitual) {
            const entryId = containerEl.dataset.containerId;
            const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });
            this.#openSpellPreparation(collection.id, event);
            const groupId = coerceToSpellGroupId(htmlClosest(event.target, "[data-group-id]")?.dataset.groupId);

            return [(await collection.addSpell(item, { groupId })) ?? []].flat();
        }

        return super._handleDroppedItem(event, item, data);
    }

    /** Replace sheet config with a special PC config form application */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        if (!this.actor.isOfType("character", "npc")) return buttons;

        if (this.isEditable) {
            const index = buttons.findIndex((b) => b.class === "close");
            buttons.splice(index, 0, {
                label: "Configure", // Top-level foundry localization key
                class: "configure-creature",
                icon: "fa-solid fa-user-gear",
                onclick: () => this.#onConfigureActor(),
            });
        }

        return buttons;
    }

    /** Open actor configuration for this sheet's creature */
    #onConfigureActor(): void {
        if (!this.actorConfigClass) return;
        new this.actorConfigClass(this.actor).render(true);
    }

    #onClickBrowseSpells(anchor: HTMLElement): void {
        const spellcastingIndex = htmlClosest(anchor, "[data-container-id]")?.dataset.containerId ?? "";
        const entry = this.actor.spellcasting.get(spellcastingIndex);
        if (!entry) return;

        const maxRank = Number(anchor.dataset.rank) || 10;
        const category = anchor.dataset.category ?? null;
        game.pf2e.compendiumBrowser.openSpellTab(entry, maxRank, category);
    }

    /** Redirect an update to shield HP to the actual item */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const heldShield = this.actor.heldShield;
        if (heldShield && typeof formData["system.attributes.shield.hp.value"] === "number") {
            await heldShield.update({
                "system.hp.value": formData["system.attributes.shield.hp.value"],
            });
        }
        delete formData["system.attributes.shield.hp.value"];

        return super._updateObject(event, formData);
    }
}

interface CreatureSheetData<TActor extends CreaturePF2e> extends ActorSheetDataPF2e<TActor> {
    actorSizes: typeof CONFIG.PF2E.actorSizes;
    rarity: typeof CONFIG.PF2E.rarityTraits;
    frequencies: typeof CONFIG.PF2E.frequencies;
    pfsFactions: typeof CONFIG.PF2E.pfsFactions;
    languages: { slug: Language | null; label: string }[];
    dying: {
        maxed: boolean;
        remainingDying: number;
        remainingWounded: number;
    };
}

export { CreatureSheetPF2e, type CreatureSheetData };
