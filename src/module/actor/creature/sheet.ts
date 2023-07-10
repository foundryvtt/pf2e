import { ActorPF2e, CreaturePF2e } from "@actor";
import { createSpellcastingDialog } from "@actor/sheet/spellcasting-dialog.ts";
import { ABILITY_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/values.ts";
import { ItemPF2e, SpellPF2e, SpellcastingEntryPF2e } from "@item";
import { ActionCategory, ActionTrait } from "@item/action/index.ts";
import { ActionType } from "@item/data/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { ITEM_CARRY_TYPES } from "@item/data/values.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { ZeroToFour, goesToEleven } from "@module/data.ts";
import { createSheetTags } from "@module/sheet/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { ErrorPF2e, fontAwesomeIcon, htmlClosest, htmlQueryAll, objectHasKey, setHasElement } from "@util";
import { ActorSheetPF2e } from "../sheet/base.ts";
import { CreatureConfig } from "./config.ts";
import { SkillAbbreviation, SkillData } from "./data.ts";
import { SpellPreparationSheet } from "./spell-preparation-sheet.ts";
import { CreatureSheetData } from "./types.ts";

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
export abstract class CreatureSheetPF2e<TActor extends CreaturePF2e> extends ActorSheetPF2e<TActor> {
    /** A DocumentSheet class presenting additional, per-actor settings */
    protected abstract readonly actorConfigClass: ConstructorOf<CreatureConfig<CreaturePF2e>> | null;

    override async getData(options?: ActorSheetOptions): Promise<CreatureSheetData<TActor>> {
        const sheetData = (await super.getData(options)) as CreatureSheetData<TActor>;
        const { actor } = this;

        // Update save labels
        if (sheetData.data.saves) {
            for (const key of ["fortitude", "reflex", "will"] as const) {
                const save = sheetData.data.saves[key];
                save.icon = this.getProficiencyIcon(save.rank);
                save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
                save.label = CONFIG.PF2E.saves[key];
            }
        }

        // Update proficiency label
        if (sheetData.data.attributes !== undefined) {
            sheetData.data.attributes.perception.icon = this.getProficiencyIcon(
                sheetData.data.attributes.perception.rank
            );
            sheetData.data.attributes.perception.hover =
                CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.perception.rank];
        }

        // Ability Scores
        if (sheetData.data.abilities) {
            for (const key of ABILITY_ABBREVIATIONS) {
                sheetData.data.abilities[key].label = CONFIG.PF2E.abilities[key];
            }
        }

        // Update skill labels
        if (sheetData.data.skills) {
            type WithSheetProperties = Record<
                SkillAbbreviation,
                SkillData & { icon?: string; hover?: string; rank?: ZeroToFour }
            >;
            const skills: WithSheetProperties = sheetData.data.skills;
            for (const [key, skill] of Object.entries(skills)) {
                const label = objectHasKey(CONFIG.PF2E.skills, key) ? CONFIG.PF2E.skills[key] : null;
                skill.icon = this.getProficiencyIcon(skill.rank ?? 0);
                skill.hover = CONFIG.PF2E.proficiencyLevels[skill.rank ?? 0];
                skill.label = skill.label ?? label ?? "";
            }
        }

        return {
            ...sheetData,
            languages: createSheetTags(CONFIG.PF2E.languages, actor.system.traits.languages),
            abilities: CONFIG.PF2E.abilities,
            skills: CONFIG.PF2E.skills,
            actorSizes: CONFIG.PF2E.actorSizes,
            alignments: deepClone(CONFIG.PF2E.alignments),
            rarity: CONFIG.PF2E.rarityTraits,
            frequencies: CONFIG.PF2E.frequencies,
            attitude: CONFIG.PF2E.attitude,
            pfsFactions: CONFIG.PF2E.pfsFactions,
            dying: {
                maxed: actor.attributes.dying.value >= actor.attributes.dying.max,
                remainingDying: Math.max(actor.attributes.dying.max - actor.attributes.dying.value),
                remainingWounded: Math.max(actor.attributes.wounded.max - actor.attributes.wounded.value),
            },
        };
    }

    /** Opens the spell preparation sheet, but only if its a prepared entry */
    protected openSpellPreparationSheet(entryId: string): void {
        const entry = this.actor.items.get(entryId);
        if (entry?.isOfType("spellcastingEntry") && entry.isPrepared) {
            const $book = this.element.find(`.item-container[data-container-id="${entry.id}"] .prepared-toggle`);
            const offset = $book.offset() ?? { left: 0, top: 0 };
            const sheet = new SpellPreparationSheet(entry, { top: offset.top - 60, left: offset.left + 200 });
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
        const html = $html[0]!;

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
                ["dying", "wounded"].includes(className)
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

        // Roll recovery flat check when Dying
        $html
            .find("[data-action=recovery-check]")
            .tooltipster({ theme: "crb-hover" })
            .filter(":not(.disabled)")
            .on("click", (event) => {
                this.actor.rollRecovery(event);
            });

        // Roll skill checks
        $html.find(".skill-name.rollable, .skill-score.rollable").on("click", (event) => {
            const skill = event.currentTarget.closest<HTMLElement>("[data-skill]")?.dataset.skill ?? "";
            const key = objectHasKey(SKILL_DICTIONARY, skill) ? SKILL_DICTIONARY[skill] : skill;
            const rollParams = eventToRollParams(event);
            this.actor.skills[key]?.check.roll(rollParams);
        });

        // Roll perception checks
        for (const element of htmlQueryAll(html, "a[data-action=perception-check]")) {
            element.addEventListener("click", (event) => {
                const extraRollOptions = element.dataset.secret ? ["secret"] : [];
                this.actor.perception.roll({ ...eventToRollParams(event), extraRollOptions });
            });
        }

        // Add, edit, and remove spellcasting entries
        for (const section of htmlQueryAll(html, ".tab.spellcasting, .tab.spells") ?? []) {
            for (const element of htmlQueryAll(section, "[data-action=spellcasting-create]") ?? []) {
                element.addEventListener("click", (event) => {
                    createSpellcastingDialog(event, this.actor);
                });
            }

            for (const element of htmlQueryAll(section, "[data-action=spellcasting-edit]") ?? []) {
                element.addEventListener("click", (event) => {
                    const containerId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
                    const entry = this.actor.items.get(containerId, { strict: true });
                    if (entry.isOfType("spellcastingEntry")) {
                        createSpellcastingDialog(event, entry);
                    }
                });
            }

            for (const element of htmlQueryAll(section, "[data-action=spellcasting-remove]") ?? []) {
                element.addEventListener("click", async (event) => {
                    const itemId = htmlClosest(event.currentTarget, "[data-item-id]")?.dataset.itemId;
                    const item = this.actor.items.get(itemId, { strict: true });

                    const title = game.i18n.localize("PF2E.DeleteSpellcastEntryTitle");
                    const content = await renderTemplate(
                        "systems/pf2e/templates/actors/delete-spellcasting-dialog.hbs"
                    );

                    // Render confirmation modal dialog
                    if (await Dialog.confirm({ title, content })) {
                        item.delete();
                    }
                });
            }
        }

        $html.find(".spell-attack").on("click", async (event) => {
            if (!this.actor.isOfType("character")) {
                throw ErrorPF2e("This sheet only works for characters");
            }
            const index = $(event.currentTarget).closest("[data-container-id]").data("containerId");
            const entry = this.actor.spellcasting.get(index);
            await entry?.statistic?.check.roll(eventToRollParams(event));
        });

        $html.find(".prepared-toggle").on("click", async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            this.openSpellPreparationSheet(itemId);
        });

        // Toggle showing slotless levels
        for (const toggle of htmlQueryAll(html, ".slotless-level-toggle")) {
            toggle.addEventListener("click", async () => {
                const itemId = htmlClosest(toggle, ".item-container")?.dataset.containerId ?? "";
                const spellcastingEntry = this.actor.items.get(itemId);
                if (!spellcastingEntry?.isOfType("spellcastingEntry")) {
                    throw ErrorPF2e("Tried to toggle visibility of slotless levels on a non-spellcasting entry");
                }
                await spellcastingEntry.update({
                    "system.showSlotlessLevels.value": !spellcastingEntry.showSlotlessLevels,
                });
            });
        }

        // Casting spells and consuming slots
        for (const button of htmlQueryAll(html, "button[data-action=cast-spell]")) {
            button.addEventListener("click", () => {
                const spellEl = htmlClosest(button, ".item");
                const { itemId, slotLevel, slotId, entryId } = spellEl?.dataset ?? {};
                const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });
                const spell = collection.get(itemId, { strict: true });
                collection.entry.cast(spell, { slot: Number(slotId ?? NaN), level: Number(slotLevel ?? NaN) });
            });
        }

        // Regenerating spell slots and spell uses
        $html.find(".spell-slots-increment-reset").on("click", (event) => {
            const target = $(event.currentTarget);
            const itemId = target.data().itemId;
            const itemLevel = target.data().level;
            const actor = this.actor;
            const item = actor.items.get(itemId);
            if (item?.isOfType("spellcastingEntry")) {
                const { system } = item.toObject();
                if (!system.slots) return;
                const slotLevel = goesToEleven(itemLevel) ? (`slot${itemLevel}` as const) : "slot0";
                system.slots[slotLevel].value = system.slots[slotLevel].max;
                item.update({ system });
            } else if (item?.isOfType("spell")) {
                const max = item.system.location.uses?.max;
                if (!max) return;
                item.update({ "system.location.uses.value": max });
            }
        });

        // We can't use form submission for these updates since duplicates force array updates.
        // We'll have to move focus points to the top of the sheet to remove this
        $html.find(".focus-pool").on("change", (event) => {
            this.actor.update({ "system.resources.focus.max": $(event.target).val() });
        });

        $html.find(".toggle-signature-spell").on("click", (event) => {
            this.#onToggleSignatureSpell(event);
        });

        // Action Browser
        for (const button of htmlQueryAll(html, ".action-browse")) {
            button.addEventListener("click", () => this.#onClickBrowseActions(button));
        }

        // Spell Browser
        for (const button of htmlQueryAll(html, ".spell-browse")) {
            button.addEventListener("click", () => this.#onClickBrowseSpellCompendia(button));
        }
    }

    /** Adds support for moving spells between spell levels, spell collections, and spell preparation */
    protected override async _onSortItem(
        event: ElementDragEvent,
        itemSource: ItemSourcePF2e
    ): Promise<ItemPF2e<TActor>[]> {
        const dropItemEl = htmlClosest(event.target, ".item");
        const dropContainerEl = htmlClosest(event.target, ".item-container");

        const dropSlotType = dropItemEl?.dataset.itemType;
        const dropContainerType = dropContainerEl?.dataset.containerType;

        const item = this.actor.items.get(itemSource._id);
        if (!item) return [];

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (item.isOfType("spell")) {
            if (!(dropItemEl && dropContainerEl)) return [];
            const entryId = dropContainerEl.dataset.containerId;
            const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });

            if (dropSlotType === "spellLevel") {
                const { level } = dropItemEl.dataset;
                const spell = await collection.addSpell(item, { slotLevel: Number(level) });
                this.openSpellPreparationSheet(collection.id);
                return [spell ?? []].flat();
            } else if (dropItemEl.dataset.slotId) {
                const dropId = Number(dropItemEl.dataset.slotId);
                const slotLevel = Number(dropItemEl.dataset.slotLevel);

                if (Number.isInteger(dropId) && Number.isInteger(slotLevel)) {
                    const allocated = await collection.prepareSpell(item, slotLevel, dropId);
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
                        if (item.level === test.level) return true;
                        return false;
                    };

                    if (sourceLocation === entryId && testSibling(item, target)) {
                        const siblings = collection.filter((s) => testSibling(item, s));
                        await item.sortRelative({ target, siblings });
                        return [target];
                    } else {
                        const spell = await collection.addSpell(item, { slotLevel: target.level });
                        this.openSpellPreparationSheet(collection.id);
                        return [spell ?? []].flat();
                    }
                }
            } else if (dropContainerType === "spellcastingEntry") {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks) {
                    console.debug("PF2e System | ***** spell from same actor dropped on a spellcasting entry *****");
                }

                const dropId = htmlClosest(event.target, ".item-container")?.dataset.containerId;
                return dropId ? [await item.update({ "system.location.value": dropId })] : [];
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

        return super._onSortItem(event, itemSource);
    }

    /** Handle dragging spells onto spell slots. */
    protected override async _handleDroppedItem(
        event: ElementDragEvent,
        item: ItemPF2e<ActorPF2e | null>,
        data: DropCanvasItemDataPF2e
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const containerEl = htmlClosest(event.target, ".item-container[data-container-type=spellcastingEntry]");
        if (containerEl && item.isOfType("spell") && !item.isRitual) {
            const entryId = containerEl.dataset.containerId;
            const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });
            const slotLevel = Number(htmlClosest(event.target, "[data-slot-level]")?.dataset.slotLevel ?? 0);
            this.openSpellPreparationSheet(collection.id);
            return [(await collection.addSpell(item, { slotLevel: Math.max(slotLevel, item.baseLevel) })) ?? []].flat();
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

    #onToggleSignatureSpell(event: JQuery.ClickEvent): void {
        const { itemId } = event.target.closest(".item").dataset;
        const spell = this.actor.items.get(itemId);
        if (!(spell instanceof SpellPF2e)) {
            return;
        }

        spell.update({ "system.location.signature": !spell.system.location.signature });
    }

    #onClickBrowseActions(button: HTMLElement) {
        const types = (button.dataset.actionType || "").split(",") as ActionType[];
        const traits = (button.dataset.actionTrait || "").split(",") as ActionTrait[];
        const categories = (button.dataset.actionCategory || "").split(",") as ActionCategory[];
        game.pf2e.compendiumBrowser.openActionTab({ types, traits, categories });
    }

    #onClickBrowseSpellCompendia(button: HTMLElement) {
        const level = Number(button.dataset.level ?? null);
        const spellcastingIndex = htmlClosest(button, "[data-container-id]")?.dataset.containerId ?? "";
        const entry = this.actor.spellcasting.get(spellcastingIndex);

        if (entry) {
            game.pf2e.compendiumBrowser.openSpellTab(entry, level);
        }
    }

    // Ensure a minimum of zero hit points and a maximum of the current max
    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        // Limit HP value to data.attributes.hp.max value
        if (!(event.currentTarget instanceof HTMLInputElement)) {
            return super._onSubmit(event, options);
        }

        const target = event.currentTarget;
        if (target.name === "system.attributes.hp.value") {
            const inputted = Number(target.value) || 0;
            target.value = Math.floor(Math.clamped(inputted, 0, this.actor.hitPoints.max)).toString();
        }

        return super._onSubmit(event, options);
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
