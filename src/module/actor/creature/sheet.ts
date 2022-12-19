import { CreaturePF2e } from "@actor";
import { CreatureSheetItemRenderer } from "@actor/sheet/item-summary-renderer";
import { createSpellcastingDialog } from "@actor/sheet/spellcasting-dialog";
import { ABILITY_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/values";
import { AbstractEffectPF2e, ItemPF2e, PhysicalItemPF2e, SpellcastingEntryPF2e, SpellPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { ITEM_CARRY_TYPES } from "@item/data/values";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data";
import { goesToEleven, ZeroToFour } from "@module/data";
import { createSheetTags } from "@module/sheet/helpers";
import { eventToRollParams } from "@scripts/sheet-util";
import { ErrorPF2e, fontAwesomeIcon, htmlClosest, htmlQueryAll, objectHasKey, setHasElement } from "@util";
import { ActorSheetPF2e } from "../sheet/base";
import { CreatureConfig } from "./config";
import { SpellPreparationSheet } from "./spell-preparation-sheet";
import { CreatureSheetData, SpellcastingSheetData } from "./types";

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
export abstract class CreatureSheetPF2e<TActor extends CreaturePF2e> extends ActorSheetPF2e<TActor> {
    override itemRenderer = new CreatureSheetItemRenderer(this);

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
            const skills = sheetData.data.skills;
            for (const [key, skill] of Object.entries(skills)) {
                const label = objectHasKey(CONFIG.PF2E.skills, key) ? CONFIG.PF2E.skills[key] : null;
                skill.icon = this.getProficiencyIcon(skill.rank);
                skill.hover = CONFIG.PF2E.proficiencyLevels[skill.rank];
                skill.label = skill.label ?? label ?? "";
            }
        }

        // Enrich condition data
        const enrich = async (content: string, rollData: Record<string, unknown>): Promise<string> => {
            return TextEditor.enrichHTML(content, { rollData, async: true });
        };
        const actorRollData = this.actor.getRollData();
        const conditions = game.pf2e.ConditionManager.getFlattenedConditions(actor.itemTypes.condition);
        for (const condition of conditions) {
            const item = this.actor.items.get(condition.id);
            if (item) {
                const rollData = { ...item.getRollData(), ...actorRollData };
                condition.enrichedDescription = await enrich(condition.description, rollData);

                if (condition.parents.length) {
                    for (const parent of condition.parents) {
                        parent.enrichedText = await enrich(parent.text, rollData);
                    }
                }

                if (condition.children.length) {
                    for (const child of condition.children) {
                        child.enrichedText = await enrich(child.text, rollData);
                    }
                }

                if (condition.overrides.length) {
                    for (const override of condition.overrides) {
                        override.enrichedText = await enrich(override.text, rollData);
                    }
                }

                if (condition.overriddenBy.length) {
                    for (const overridenBy of condition.overriddenBy) {
                        overridenBy.enrichedText = await enrich(overridenBy.text, rollData);
                    }
                }
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
            conditions,
            dying: {
                maxed: actor.attributes.dying.value >= actor.attributes.dying.max,
                remainingDying: Math.max(actor.attributes.dying.max - actor.attributes.dying.value),
                remainingWounded: Math.max(actor.attributes.wounded.max - actor.attributes.wounded.value),
            },
        };
    }

    /** Opens the spell preparation sheet, but only if its a prepared entry */
    protected openSpellPreparationSheet(entryId: string) {
        const entry = this.actor.items.get(entryId);
        if (entry?.isOfType("spellcastingEntry") && entry.isPrepared) {
            const $book = this.element.find(`.item-container[data-container-id="${entry.id}"] .prepared-toggle`);
            const offset = $book.offset() ?? { left: 0, top: 0 };
            const sheet = new SpellPreparationSheet(entry, { top: offset.top - 60, left: offset.left + 200 });
            sheet.render(true);
        }
    }

    protected async prepareSpellcasting(): Promise<SpellcastingSheetData[]> {
        const entries = await Promise.all(
            this.actor.spellcasting.map(async (entry) => {
                const data = entry.toObject(false);
                const spellData = await entry.getSpellData();
                return mergeObject(data, spellData);
            })
        );
        return entries.sort((a, b) => a.sort - b.sort);
    }

    /** Get the font-awesome icon used to display a certain level of skill proficiency */
    protected getProficiencyIcon(level: ZeroToFour): string {
        return [...Array(level)].map(() => fontAwesomeIcon("check-circle").outerHTML).join("");
    }

    /** Preserve browser focus on unnamed input elements when updating */
    protected override async _render(force?: boolean, options?: RenderOptions): Promise<void> {
        const focused = document.activeElement;
        const contained = this.element.get(0)?.contains(focused);

        await super._render(force, options);

        if (focused instanceof HTMLInputElement && focused.name && contained) {
            const selector = `input[data-property="${focused.name}"]:not([name])`;
            const sameInput = this.element.get(0)?.querySelector<HTMLInputElement>(selector);
            sameInput?.focus();
            sameInput?.select();
        }
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0]!;

        // Handlers for number inputs of properties subject to modification by AE-like rules elements
        const manualPropertyInputs = htmlQueryAll(html, "select[data-property],input[data-property]");
        for (const input of manualPropertyInputs) {
            input.addEventListener("focus", () => {
                const propertyPath = input.dataset.property ?? "";
                input.setAttribute("name", propertyPath);
                if (input instanceof HTMLInputElement) {
                    const baseValue = Number(getProperty(this.actor._source, propertyPath));
                    input.value = String(baseValue);
                }
            });

            input.addEventListener("blur", () => {
                input.removeAttribute("name");
                input.removeAttribute("style");
                const propertyPath = input.dataset.property ?? "";
                const preparedValue = getProperty(this.actor, propertyPath);
                if (input instanceof HTMLInputElement) {
                    const isModifier = input.classList.contains("modifier") && Number(preparedValue) >= 0;
                    const value = isModifier ? `+${preparedValue}` : preparedValue;
                    input.value = String(value);
                }
            });
        }

        // Toggle equip
        $html.find(".tab.inventory a[data-carry-type]").on("click", (event) => {
            $html.find(".carry-type-hover").tooltipster("close");

            const itemId = $(event.currentTarget).closest("[data-item-id]").attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId, { strict: true });
            if (!(item instanceof PhysicalItemPF2e)) {
                throw ErrorPF2e("Tried to update carry type of non-physical item");
            }

            const carryType = $(event.currentTarget).attr("data-carry-type") ?? "";
            const handsHeld = Number($(event.currentTarget).attr("data-hands-held")) ?? 1;
            const inSlot = $(event.currentTarget).attr("data-in-slot") === "true";
            if (carryType && setHasElement(ITEM_CARRY_TYPES, carryType)) {
                this.actor.adjustCarryType(item, carryType, handsHeld, inSlot);
            }
        });

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

        // Adding/Editing/Removing Spellcasting entries
        for (const section of htmlQueryAll(html, ".tab.spellcasting, .tab.spells") ?? []) {
            for (const element of htmlQueryAll(section, "[data-action=spellcasting-create]") ?? []) {
                element.addEventListener("click", (event) => {
                    createSpellcastingDialog(event, this.actor);
                });
            }

            for (const element of htmlQueryAll(section, "[data-action=spellcasting-edit]") ?? []) {
                element.addEventListener("click", (event) => {
                    const containerId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
                    const entry = this.actor.spellcasting.get(containerId, { strict: true });
                    createSpellcastingDialog(event, entry as Embedded<SpellcastingEntryPF2e>);
                });
            }

            for (const element of htmlQueryAll(section, "[data-action=spellcasting-remove]") ?? []) {
                element.addEventListener("click", async (event) => {
                    const itemId = htmlClosest(event.currentTarget, "[data-item-id]")?.dataset.itemId;
                    const item = this.actor.items.get(itemId, { strict: true });

                    const title = game.i18n.localize("PF2E.DeleteSpellcastEntryTitle");
                    const content = await renderTemplate(
                        "systems/pf2e/templates/actors/delete-spellcasting-dialog.html"
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
            if (entry) {
                await entry.statistic.check.roll(eventToRollParams(event));
            }
        });

        $html.find(".prepared-toggle").on("click", async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            this.openSpellPreparationSheet(itemId);
        });

        // Update max slots for Spell Items
        $html.find(".slotless-level-toggle").on("click", async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            const itemToEdit = this.actor.items.get(itemId);
            if (!itemToEdit?.isOfType("spellcastingEntry"))
                throw new Error("Tried to toggle visibility of slotless levels on a non-spellcasting entry");
            const bool = !(itemToEdit.system.showSlotlessLevels || {}).value;

            await this.actor.updateEmbeddedDocuments("Item", [
                {
                    _id: itemId ?? "",
                    "system.showSlotlessLevels.value": bool,
                },
            ]);
        });

        // Casting spells and consuming slots
        $html.find("button[data-action=cast-spell]").on("click", (event) => {
            const $spellEl = $(event.currentTarget).closest(".item");
            const { itemId, slotLevel, slotId, entryId } = $spellEl.data();
            const collection = this.actor.spellcasting.collections.get(entryId, { strict: true });
            const spell = collection.get(itemId, { strict: true });
            collection.entry.cast(spell, { slot: slotId, level: slotLevel });
        });

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
            this.onToggleSignatureSpell(event);
        });

        // Action Browser
        $html.find(".action-browse").on("click", () => game.pf2e.compendiumBrowser.openTab("action"));

        // Spell Browser
        $html.find(".spell-browse").on("click", (event) => this.onClickBrowseSpellCompendia(event));

        // Decrease effect value
        $html.find(".effects-list .decrement").on("click", async (event) => {
            const target = $(event.currentTarget);
            const parent = target.parents(".item");
            const effect = this.actor.items.get(parent.attr("data-item-id") ?? "");
            if (effect instanceof AbstractEffectPF2e) {
                await effect.decrease();
            }
        });

        // Increase effect value
        $html.find(".effects-list .increment").on("click", async (event) => {
            const target = $(event.currentTarget);
            const parent = target.parents(".item");
            const effect = this.actor?.items.get(parent.attr("data-item-id") ?? "");
            if (effect instanceof AbstractEffectPF2e) {
                await effect.increase();
            }
        });

        // Change whether an effect is secret to players or not
        for (const element of htmlQueryAll(html, ".effects-list [data-action=effect-toggle-unidentified]") ?? []) {
            element.addEventListener("click", async (event) => {
                const effectId = htmlClosest(event.currentTarget, "[data-item-id]")?.dataset.itemId;
                const effect = this.actor.items.get(effectId, { strict: true });
                if (effect instanceof AbstractEffectPF2e) {
                    const isUnidentified = effect.unidentified;
                    await effect.update({ "system.unidentified": !isUnidentified });
                }
            });
        }
    }

    /** Adds support for moving spells between spell levels, spell collections, and spell preparation */
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
            const collection = this.actor.spellcasting.collections.get(targetLocation, { strict: true });

            if (dropSlotType === "spellLevel") {
                const { level } = $dropItemEl.data();
                const spell = await collection.addSpell(item, { slotLevel: Number(level) });
                this.openSpellPreparationSheet(collection.id);
                return [spell ?? []].flat();
            } else if ($dropItemEl.attr("data-slot-id")) {
                const dropId = Number($dropItemEl.attr("data-slot-id"));
                const slotLevel = Number($dropItemEl.attr("data-slot-level"));

                if (Number.isInteger(dropId) && Number.isInteger(slotLevel)) {
                    const allocated = await collection.prepareSpell(item, slotLevel, dropId);
                    if (allocated) return [allocated];
                }
            } else if (dropSlotType === "spell") {
                const dropId = $dropItemEl.attr("data-item-id") ?? "";
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

                    if (sourceLocation === targetLocation && testSibling(item, target)) {
                        const siblings = collection.filter((spell) => testSibling(item, spell));
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
                if (CONFIG.debug.hooks)
                    console.debug("PF2e System | ***** spell from same actor dropped on a spellcasting entry *****");

                const dropId = $(event.target).parents(".item-container").attr("data-container-id");
                return dropId ? [await item.update({ "system.location.value": dropId })] : [];
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
                    source.sortRelative({ target, siblings });
                    return [target];
                }
            }
        }

        return super._onSortItem(event, itemSource);
    }

    /** Handle dragging spells onto spell slots. */
    protected override async _handleDroppedItem(
        event: ElementDragEvent,
        item: ItemPF2e,
        data: DropCanvasItemDataPF2e
    ): Promise<ItemPF2e[]> {
        const containerEl = htmlClosest(event.target, ".item-container");
        if (item.isOfType("spell") && containerEl?.dataset.containerType === "spellcastingEntry") {
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
                icon: "fas fa-cog",
                onclick: () => this.onConfigureActor(),
            });
        }

        return buttons;
    }

    /** Open actor configuration for this sheet's creature */
    private onConfigureActor(): void {
        if (!this.actorConfigClass) return;
        new this.actorConfigClass(this.actor).render(true);
    }

    private onToggleSignatureSpell(event: JQuery.ClickEvent): void {
        const { itemId } = event.target.closest(".item").dataset;
        const spell = this.actor.items.get(itemId);
        if (!(spell instanceof SpellPF2e)) {
            return;
        }

        spell.update({ "system.location.signature": !spell.system.location.signature });
    }

    private onClickBrowseSpellCompendia(event: JQuery.ClickEvent<HTMLElement>) {
        const level = Number($(event.currentTarget).attr("data-level")) ?? null;
        const spellcastingIndex = $(event.currentTarget).closest("[data-container-id]").attr("data-container-id") ?? "";
        const entry = this.actor.spellcasting.get(spellcastingIndex);
        if (!(entry instanceof SpellcastingEntryPF2e)) {
            return;
        }

        game.pf2e.compendiumBrowser.openSpellTab(entry, level);
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
