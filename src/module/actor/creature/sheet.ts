import type { ActorPF2e, CreaturePF2e } from "@actor";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { createSpellcastingDialog } from "@actor/sheet/spellcasting-dialog.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { ApplicationV1HeaderButton } from "@client/appv1/api/application-v1.d.mts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import { ItemPF2e, type SpellPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ITEM_CARRY_TYPES } from "@item/base/data/values.ts";
import { coerceToSpellGroupId, spellSlotGroupIdToNumber } from "@item/spellcasting-entry/helpers.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { TradeDialog } from "@module/apps/trade-dialog/app.ts";
import { DropCanvasItemData } from "@module/canvas/drop-canvas-data.ts";
import { OneToTen, ZeroToFour, goesToEleven } from "@module/data.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { ErrorPF2e, createHTMLElement, fontAwesomeIcon, htmlClosest, htmlQueryAll, tupleHasValue } from "@util";
import * as R from "remeda";
import { ActorSheetPF2e, SheetClickActionHandlers } from "../sheet/base.ts";
import { CreatureConfig } from "./config.ts";
import { Language, ResourceData } from "./index.ts";
import { SpellPreparationSheet } from "./spell-preparation-sheet.ts";

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
abstract class CreatureSheetPF2e<TActor extends CreaturePF2e> extends ActorSheetPF2e<TActor> {
    /** A DocumentSheet class presenting additional, per-actor settings */
    protected abstract readonly actorConfigClass: ConstructorOf<CreatureConfig<CreaturePF2e>> | null;

    override async getData(options?: Partial<ActorSheetOptions>): Promise<CreatureSheetData<TActor>> {
        const sheetData = await super.getData(options);
        const actor = this.actor;

        const unavailableLanguages: Set<string> = game.settings.get("pf2e", "homebrew.languageRarities").unavailable;
        const languages = actor.isOfType("character")
            ? [] // Languages for PCs are handled in the PC sheet subclass
            : actor.system.details.languages.value
                  .filter((l) => l in CONFIG.PF2E.languages && !unavailableLanguages.has(l))
                  .map((slug) => ({ slug, label: game.i18n.localize(CONFIG.PF2E.languages[slug] ?? slug) }))
                  .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

        sheetData.data.perception.senses = R.sortBy(sheetData.data.perception.senses, (a) => a.label ?? "");
        const initiativeOptions = [{ value: "perception", label: "PF2E.PerceptionLabel" }];
        initiativeOptions.push(...Object.values(this.actor.skills).map((s) => ({ value: s.slug, label: s.label })));

        return {
            ...sheetData,
            languages,
            actorSizes: CONFIG.PF2E.actorSizes,
            rarity: CONFIG.PF2E.rarityTraits,
            frequencies: CONFIG.PF2E.frequencies,
            pfsFactions: CONFIG.PF2E.pfsFactions,
            initiativeOptions,
            dying: {
                maxed: actor.attributes.dying.value >= actor.attributes.dying.max,
                remainingDying: Math.max(actor.attributes.dying.max - actor.attributes.dying.value),
                remainingWounded: Math.max(actor.attributes.wounded.max - actor.attributes.wounded.value),
            },
            specialResources: Object.values(this.actor.synthetics.resources).map((r) =>
                R.pick(r, ["slug", "label", "value", "max"]),
            ),
        };
    }

    /** Opens the spell preparation sheet, but only if its a prepared entry */
    #openSpellPreparation(collectionId: string, event?: DragEvent | PointerEvent): void {
        const entry = this.actor.items.get(collectionId, { strict: true });
        if (entry?.isOfType("spellcastingEntry") && entry.isPrepared) {
            const referenceEl = htmlClosest(event?.target, "[data-action=open-spell-preparation]");
            const offset = referenceEl ? ($(referenceEl).offset() ?? { left: 0, top: 0 }) : null;
            const options = offset ? { top: offset.top - 60, left: offset.left + 200 } : {};
            const sheet = new SpellPreparationSheet(entry, options);
            sheet.render(true);
        }
    }

    protected async prepareSpellcasting(): Promise<SpellcastingSheetData[]> {
        const entries = await Promise.all(
            this.actor.spellcasting.collections.map((spells) => spells.entry.getSheetData({ spells })),
        );
        return entries.sort((a, b) => a.sort - b.sort);
    }

    /** Get the font-awesome icon used to display a certain level of skill proficiency */
    protected getProficiencyIcon(level: ZeroToFour): string {
        return [...Array(level)].map(() => fontAwesomeIcon("check-circle").outerHTML).join("");
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Increase/decrease Dying/Wounded value
        for (const pips of htmlQueryAll(html, "a[data-action=adjust-condition-value]")) {
            const slug = pips.dataset.condition === "dying" ? "dying" : "wounded";
            pips.addEventListener("click", () => {
                const currentMax = this.actor.system.attributes[slug]?.max;
                return this.actor.increaseCondition(slug, { max: currentMax });
            });
            pips.addEventListener("contextmenu", () => {
                return this.actor.decreaseCondition(slug);
            });
        }

        // Resource Pips
        const resourcePips = htmlQueryAll(html, "[data-action=adjust-resource]:not(input)");
        if (resourcePips.length > 0) {
            const listener = (event: Event) => {
                const resourceSlug = htmlClosest(event.target, "[data-resource]")?.dataset.resource ?? "";
                const resource = this.actor.getResource(resourceSlug);
                if (resource) {
                    const current = resource.value;
                    const change = event.type === "click" ? 1 : -1;
                    this.actor.updateResource(resourceSlug, current + change);
                }
            };

            for (const pips of resourcePips) {
                pips.addEventListener("click", listener);
                pips.addEventListener("contextmenu", listener);
            }
        }

        // Resource Input Fields
        const resourceInputs = htmlQueryAll<HTMLInputElement>(html, "input[data-resource]");
        for (const element of resourceInputs) {
            const resourceSlug = element.dataset.resource ?? "";
            const resource = this.actor.getResource(resourceSlug);
            if (!resource) continue;

            element.addEventListener("change", () => {
                const rawValue = element.value.trim();
                const isDelta = rawValue.startsWith("+") || rawValue.startsWith("-");
                const newValue = isDelta ? resource.value + Number(rawValue) : Number(rawValue);
                if (Number.isNaN(newValue)) {
                    element.value = String(resource.value);
                } else {
                    this.actor.updateResource(resourceSlug, newValue);
                }
            });
        }
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);
        const actor = this.actor;

        handlers["perception-check"] = (event, anchor) => {
            const extraRollOptions = anchor.dataset.secret ? ["secret"] : [];
            return actor.perception.roll({ ...eventToRollParams(event, { type: "check" }), extraRollOptions });
        };

        handlers["draw-item"] = (event) => {
            const itemId = htmlClosest(event.target, "[data-item-id")?.dataset.itemId;
            const item = actor.inventory.get(itemId, { strict: true });
            return actor.changeCarryType(item, { carryType: "held", handsHeld: 1 });
        };

        handlers["recovery-check"] = (event) => actor.rollRecovery(event);

        handlers["consume-item"] = (event) => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const item = actor.inventory.get(itemId, { strict: true });
            return item.isOfType("consumable") && item.consume();
        };

        handlers["open-carry-type-menu"] = (_, anchor) => this.#openCarryTypeMenu(anchor);

        // SPELLCASTING

        // Casting spells and consuming slots or focus points
        handlers["cast-spell"] = (event): Promise<void> | void => {
            const spellRow = htmlClosest(event.target, "[data-item-id]");
            const { itemId, entryId, slotId } = spellRow?.dataset ?? {};
            const collection = actor.spellcasting.collections.get(entryId, { strict: true });
            const spell = collection.get(itemId, { strict: true });
            const maybeCastRank = Number(spellRow?.dataset.castRank) || NaN;
            if (Number.isInteger(maybeCastRank) && maybeCastRank.between(1, 10)) {
                const rank = maybeCastRank as OneToTen;
                return spell.parentItem?.consume() ?? collection.entry.cast(spell, { rank, slotId: Number(slotId) });
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

            const slotIndex = Number(row?.dataset.slotId) || 0;
            const entryId = row?.dataset.entryId;
            const collection = actor.spellcasting.collections.get(entryId, { strict: true });
            return collection.prepareSpell(null, groupId, slotIndex);
        };

        // Set expended state of a spell slot
        handlers["toggle-slot-expended"] = (event) => {
            const row = htmlClosest(event.target, "[data-item-id]");
            const groupId = coerceToSpellGroupId(row?.dataset.groupId);
            if (!groupId) throw ErrorPF2e("Unexpected error toggling expended state");

            const slotId = Number(row?.dataset.slotId) || 0;
            const entryId = row?.dataset.entryId ?? "";
            const expend = row?.dataset.slotExpended === undefined;
            const collection = actor.spellcasting.collections.get(entryId);

            return collection?.setSlotExpendedState(groupId, slotId, expend);
        };

        handlers["toggle-signature-spell"] = (event) => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const spell = actor.items.get(itemId, { strict: true });
            if (!spell?.isOfType("spell")) return;
            return spell.update({ "system.location.signature": !spell.system.location.signature });
        };

        handlers["toggle-show-slotless-ranks"] = (event) => {
            const collectionId = htmlClosest(event.target, "[data-container-id]")?.dataset.containerId;
            const spellcastingEntry = actor.items.get(collectionId, { strict: true });
            if (!spellcastingEntry.isOfType("spellcastingEntry")) {
                throw ErrorPF2e("Tried to toggle visibility of slotless ranks on a non-spellcasting entry");
            }
            return spellcastingEntry.update({
                "system.showSlotlessLevels.value": !spellcastingEntry.showSlotlessRanks,
            });
        };

        // Regenerating spell slots and spell uses
        handlers["reset-spell-slots"] = (event): Promise<unknown> | void => {
            const row = htmlClosest(event.target, "[data-item-id]");
            const itemId = row?.dataset.itemId;
            const item = actor.items.get(itemId, { strict: true });

            if (item.isOfType("spellcastingEntry")) {
                const { system } = item.toObject();
                if (!system.slots) return;
                const groupNumber = spellSlotGroupIdToNumber(row?.dataset.groupId) || 0;
                const propertyKey = goesToEleven(groupNumber) ? (`slot${groupNumber}` as const) : "slot0";
                system.slots[propertyKey].value = system.slots[propertyKey].max;
                return item.update({ system });
            } else if (item.isOfType("spell")) {
                const max = item.system.location.uses?.max;
                if (!max) return;
                return item.update({ "system.location.uses.value": max });
            }
        };

        // Spellcasting entries

        // Add, edit, and remove spellcasting entries
        handlers["spellcasting-create"] = () => {
            return createSpellcastingDialog(actor);
        };
        handlers["spellcasting-edit"] = (event): Promise<unknown> | void => {
            const containerId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const entry = actor.items.get(containerId, { strict: true });
            if (entry.isOfType("spellcastingEntry")) {
                return createSpellcastingDialog(entry);
            }
        };
        handlers["spellcasting-remove"] = async (event): Promise<ItemPF2e<TActor> | void> => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            const item = actor.items.get(itemId, { strict: true });
            const content = await fa.handlebars.renderTemplate(
                "systems/pf2e/templates/actors/delete-spellcasting-dialog.hbs",
            );

            // Render confirmation modal dialog
            if (
                await foundry.applications.api.DialogV2.confirm({
                    window: { title: "PF2E.DeleteSpellcastEntryTitle", icon: "fa-solid fa-trash" },
                    content,
                })
            ) {
                return item.delete();
            }
        };

        return handlers;
    }

    // Change carry type
    async #openCarryTypeMenu(anchor: HTMLElement): Promise<void> {
        // Close the menu and return early if any carry-type menu is already open
        const menuOpen = !!document.body.querySelector("aside.locked-tooltip.carry-type-menu");
        if (menuOpen) game.tooltip.dismissLockedTooltips();

        const itemId = htmlClosest(anchor, "[data-item-id]")?.dataset.itemId;
        const item = this.actor.inventory.get(itemId, { strict: true });
        const hasStowingContainers = this.actor.itemTypes.backpack.some((i) => i.system.stowing && !i.isInContainer);
        const templatePath = "systems/pf2e/templates/actors/partials/carry-type.hbs";
        const templateArgs = { item, hasStowingContainers };
        const template = await fa.handlebars.renderTemplate(templatePath, templateArgs);
        const html = createHTMLElement("ul", { innerHTML: template });

        html.addEventListener("click", (event) => {
            const menuOption = htmlClosest(event.target, "a[data-carry-type]");
            if (!menuOption) return;

            const carryType = menuOption.dataset.carryType;
            if (!tupleHasValue(ITEM_CARRY_TYPES, carryType)) {
                throw ErrorPF2e("Unexpected error retrieving requested carry type");
            }

            const handsHeld = Number(menuOption.dataset.handsHeld) || 0;
            if (!tupleHasValue([0, 1, 2], handsHeld)) {
                throw ErrorPF2e("Invalid number of hands specified");
            }

            const inSlot = "inSlot" in menuOption.dataset;
            const current = item.system.equipped;
            if (
                carryType !== current.carryType ||
                inSlot !== current.inSlot ||
                (carryType === "held" && handsHeld !== current.handsHeld)
            ) {
                this.actor.changeCarryType(item, { carryType, handsHeld, inSlot });
                game.tooltip.dismissLockedTooltips();
            }
        });

        game.tooltip.activate(anchor, { cssClass: "pf2e carry-type-menu", html, locked: true });
    }

    protected override async _onDropItem(event: DragEvent, data: DropCanvasItemData): Promise<ItemPF2e[]> {
        const actor = this.actor;
        const spellFrom = data.spellFrom;
        if (spellFrom) {
            // Confirm whether this is a swap and execute if so
            const { collectionId, groupId, slotIndex } = spellFrom;
            const collection = actor.spellcasting.collections.get(spellFrom.collectionId, { strict: true });
            const isPrepared = collection.entry.category === "prepared";
            const collectionEl = htmlClosest(event.target, "[data-container-id]");
            const sameCollectionId = collectionId === collectionEl?.dataset.containerId;
            const targetDataset = htmlClosest(event.target, "[data-item-id]")?.dataset ?? {};
            const sameGroupId = groupId === targetDataset.groupId;
            const targetIsEmpty = targetDataset.itemId?.length !== 16;
            if (isPrepared && sameCollectionId && sameGroupId && !targetIsEmpty) {
                const draggedSpell = await ItemPF2e.fromDropData(data);
                const dropTargetSpell = actor.items.get(targetDataset.itemId ?? "");
                if (!draggedSpell?.isOfType("spell") || !dropTargetSpell?.isOfType("spell")) {
                    throw ErrorPF2e("Unexpected data received while swapping spells");
                }
                collection.swapSlotPositions(groupId, slotIndex, Number(targetDataset.slotId));
                return [draggedSpell];
            }
        }

        return (await this.#attemptTrade(data, event)) ? [] : super._onDropItem(event, data);
    }

    /**
     * Determine whether a dropped item can be used for trading and initiate a trade if so.
     * @returns whether a trade initiation request was sent
     */
    async #attemptTrade(data: DropCanvasItemData, event: DragEvent): Promise<boolean> {
        const traderActor = this.actor;
        if (traderActor.isLootableBy(game.user)) return false;
        const item = await ItemPF2e.fromDropData(data);
        const selfActor = item?.actor;
        if (!selfActor) return false;
        const traderUser = game.users
            .filter((u) => u.active && !u.isSelf && traderActor.testUserPermission(u, "OWNER"))
            .sort((a, b) => Number(a.isGM) - Number(b.isGM))[0];
        const args = {
            self: { actor: selfActor, item, gift: event.shiftKey },
            trader: { user: traderUser, actor: traderActor },
            checkReach: game.pf2e.settings.automation.reachEnforcement,
        };
        return TradeDialog.canTrade(args) ? !!TradeDialog.requestTrade(args) : false;
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
            const slotId = Number(dropItemEl.dataset.slotId);

            if (dropSlotType === "spell-slot-group") {
                const spell = await collection.addSpell(item, { groupId });
                this.#openSpellPreparation(collection.id);
                return [spell ?? []].flat();
            } else if (groupId && Number.isInteger(slotId)) {
                await collection.prepareSpell(item, groupId, slotId);
                return [item];
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
        data: DropCanvasItemData,
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const containerEl = htmlClosest(event.target, "[data-container-type=spellcastingEntry]");
        if (containerEl && item.isOfType("spell") && !item.isRitual) {
            const collectionId = containerEl.dataset.containerId;
            const collection = this.actor.spellcasting.collections.get(collectionId, { strict: true });
            this.#openSpellPreparation(collection.id, event);
            const groupId = coerceToSpellGroupId(htmlClosest(event.target, "[data-group-id]")?.dataset.groupId);

            return [(await collection.addSpell(item, { groupId })) ?? []].flat();
        }

        return super._handleDroppedItem(event, item, data);
    }

    /** Replace sheet config with a special PC config form application */
    protected override _getHeaderButtons(): ApplicationV1HeaderButton[] {
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
    initiativeOptions: FormSelectOption[];
    dying: {
        maxed: boolean;
        remainingDying: number;
        remainingWounded: number;
    };
    specialResources: ResourceData[];
}

export { CreatureSheetPF2e, type CreatureSheetData };
