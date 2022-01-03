import { ItemDataPF2e } from "@item/data";
import { LocalizePF2e } from "@system/localize";
import { ItemSheetDataPF2e, SheetOptions, SheetSelections } from "./data-types";
import { ItemPF2e, LorePF2e } from "@item";
import { RuleElementSource } from "@module/rules";
import Tagify from "@yaireo/tagify";
import {
    BasicConstructorOptions,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TagSelectorBasic,
    TAG_SELECTOR_TYPES,
} from "@module/system/trait-selector";
import { ErrorPF2e, sluggify, tupleHasValue } from "@util";
import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";

export class ItemSheetPF2e<TItem extends ItemPF2e> extends ItemSheet<TItem> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 650;
        options.height = 460;
        options.classes = options.classes.concat(["pf2e", "item"]);
        options.template = "systems/pf2e/templates/items/item-sheet.html";
        options.scrollY = [".tab.active"];
        options.tabs = [
            {
                navSelector: ".tabs",
                contentSelector: ".sheet-body",
                initial: "description",
            },
            {
                navSelector: ".mystify-nav",
                contentSelector: ".mystify-sheet",
                initial: "unidentified",
            },
        ];

        return options;
    }

    override async getData() {
        const data: any = this.getBaseData();
        data.abilities = CONFIG.PF2E.abilities;
        data.saves = CONFIG.PF2E.saves;

        const itemData: ItemDataPF2e = data.item;

        mergeObject(data, {
            hasSidebar: true,
            sidebarTemplate: () => `systems/pf2e/templates/items/${itemData.type}-sidebar.html`,
            hasDetails: [
                "action",
                "armor",
                "backpack",
                "book",
                "condition",
                "consumable",
                "deity",
                "equipment",
                "feat",
                "lore",
                "melee",
                "spell",
                "weapon",
            ].includes(itemData.type),
            detailsTemplate: () => `systems/pf2e/templates/items/${itemData.type}-details.html`,
        }); // Damage types

        const dt = duplicate(CONFIG.PF2E.damageTypes);
        if (itemData.type === "spell") mergeObject(dt, CONFIG.PF2E.healingTypes);
        data.damageTypes = dt;

        // do not let user set bulk if in a stack group because the group determines bulk
        const stackGroup = data.data?.stackGroup?.value;
        data.bulkDisabled = stackGroup !== undefined && stackGroup !== null && stackGroup.trim() !== "";
        data.rarity = CONFIG.PF2E.rarityTraits;
        data.usage = CONFIG.PF2E.usageTraits; // usage data
        data.stackGroups = CONFIG.PF2E.stackGroups;

        if (itemData.type === "treasure") {
            data.currencies = CONFIG.PF2E.currencies;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "consumable") {
            data.consumableTypes = CONFIG.PF2E.consumableTypes;
            data.traits = this.prepareOptions(CONFIG.PF2E.consumableTraits, itemData.data.traits, {
                selectedOnly: true,
            });
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.stackGroups = CONFIG.PF2E.stackGroups;
            data.consumableTraits = CONFIG.PF2E.consumableTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "melee") {
            // Melee Data
            data.hasSidebar = false;
            data.detailsActive = true;
            data.damageTypes = CONFIG.PF2E.damageTypes;

            data.attackEffects = this.prepareOptions(this.getAttackEffectOptions(), data.data.attackEffects);
            data.traits = this.prepareOptions(CONFIG.PF2E.npcAttackTraits, data.data.traits, { selectedOnly: true });
        } else if (itemData.type === "condition") {
            // Condition types

            data.conditions = [];
        } else if (itemData.type === "equipment") {
            // Equipment data
            data.traits = this.prepareOptions(CONFIG.PF2E.equipmentTraits, itemData.data.traits, {
                selectedOnly: true,
            });
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.stackGroups = CONFIG.PF2E.stackGroups;
            data.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "backpack") {
            // Backpack data
            data.traits = this.prepareOptions(CONFIG.PF2E.equipmentTraits, itemData.data.traits, {
                selectedOnly: true,
            });
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "lore") {
            // Lore-specific data
            data.proficiencies = CONFIG.PF2E.proficiencyLevels;
        }

        const translations: Record<string, string> = LocalizePF2e.translations.PF2E.RuleElement;
        data.ruleLabels = itemData.data.rules.map((ruleData: RuleElementSource) => {
            const key = ruleData.key.replace(/^PF2E\.RuleElement\./, "");
            const label = translations[key] ?? translations.Unrecognized;
            const recognized = label !== translations.Unrecognized;
            return {
                label: recognized ? label : game.i18n.localize("PF2E.RuleElement.Unrecognized"),
                recognized,
            };
        });

        return data;
    }

    /** An alternative to super.getData() for subclasses that don't need this class's `getData` */
    protected getBaseData(options: Partial<DocumentSheetOptions> = {}): ItemSheetDataPF2e<TItem> {
        options.classes?.push(this.item.type);

        const itemData = this.item.clone({}, { keepId: true }).data;
        itemData.data.rules = itemData.toObject().data.rules;

        const rollData = this.item.getRollData();
        itemData.data.description.value = game.pf2e.TextEditor.enrichHTML(itemData.data.description.value, {
            rollData,
        });

        const isEditable = this.isEditable;
        return {
            itemType: null,
            hasSidebar: false,
            hasDetails: true,
            cssClass: isEditable ? "editable" : "locked",
            editable: isEditable,
            document: this.item,
            item: itemData,
            data: itemData.data,
            limited: this.item.limited,
            options: this.options,
            owner: this.item.isOwner,
            title: this.title,
            user: { isGM: game.user.isGM },
            enabledRulesUI: game.settings.get("pf2e", "enabledRulesUI"),
        };
    }

    /** Prepare form options on the item sheet */
    protected prepareOptions(
        options: Record<string, string>,
        selections: SheetSelections | (string[] & { custom?: never }),
        { selectedOnly = false } = {}
    ): SheetOptions {
        const sheetOptions = Object.entries(options).reduce((compiledOptions: SheetOptions, [stringKey, label]) => {
            const selectionList = Array.isArray(selections) ? selections : selections.value;
            const key = typeof selectionList[0] === "number" ? Number(stringKey) : stringKey;
            const isSelected = selectionList.includes(key);
            if (isSelected || !selectedOnly) {
                compiledOptions[key] = {
                    label,
                    value: stringKey,
                    selected: isSelected,
                };
            }
            return compiledOptions;
        }, {});

        if (selections.custom) {
            sheetOptions.custom = {
                label: selections.custom,
                value: "",
                selected: true,
            };
        }

        return sheetOptions;
    }

    protected onTagSelector(event: JQuery.TriggeredEvent): void {
        event.preventDefault();
        const $anchor = $(event.currentTarget);
        const selectorType = $anchor.attr("data-trait-selector") ?? "";
        if (!(selectorType === "basic" && tupleHasValue(TAG_SELECTOR_TYPES, selectorType))) {
            throw ErrorPF2e("Item sheets can only use the basic tag selector");
        }
        const propertyIsFlat = !!$anchor.attr("data-flat");
        const objectProperty = $anchor.attr("data-property") ?? "";
        const title = $anchor.attr("data-title");
        const configTypes = ($anchor.attr("data-config-types") ?? "")
            .split(",")
            .map((type) => type.trim())
            .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
        const selectorOptions: BasicConstructorOptions = {
            objectProperty,
            configTypes,
            title,
            flat: propertyIsFlat,
        };

        const noCustom = $anchor.attr("data-no-custom") === "true";
        if (noCustom) {
            selectorOptions.allowCustom = false;
        } else if (this.actor && configTypes.includes("attackEffects")) {
            selectorOptions.customChoices = this.getAttackEffectOptions();
        }

        new TagSelectorBasic(this.item, selectorOptions).render(true);
    }

    /**
     * Get NPC attack effect options
     */
    protected getAttackEffectOptions(): Record<string, string> {
        // Melee attack effects can be chosen from the NPC's actions and consumable items
        const attackEffectOptions: Record<string, string> =
            this.actor?.items
                .filter((item) => item.type === "action" || item.type === "consumable")
                .reduce((options, item) => {
                    const key = item.slug ?? sluggify(item.name);
                    return mergeObject(options, { [key]: item.name }, { inplace: false });
                }, CONFIG.PF2E.attackEffects) ?? {};

        return attackEffectOptions;
    }

    private async addDamageRoll(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const newKey = randomID(20);
        const newDamageRoll = {
            damage: "",
            damageType: "",
        };
        return this.item.update({
            [`data.damageRolls.${newKey}`]: newDamageRoll,
        });
    }

    private async deleteDamageRoll(event: JQuery.TriggeredEvent): Promise<ItemPF2e> {
        event.preventDefault();
        if (event.originalEvent) {
            await this._onSubmit(event.originalEvent);
        }
        const targetKey = $(event.target).parents(".damage-part").attr("data-damage-part");
        return this.item.update({
            [`data.damageRolls.-=${targetKey}`]: null,
        });
    }

    /** Pull the latest system data from the source compendium and replace the item's with it */
    private async refreshItemFromCompendium(): Promise<void> {
        if (!this.item.isOwned) return ui.notifications.error("This utility may only be used on owned items");

        const currentSource = this.item.toObject();
        const latestSource = (await fromUuid<this["item"]>(this.item.sourceId ?? ""))?.toObject();
        if (latestSource?.type === this.item.data.type) {
            const updatedImage = currentSource.img.endsWith(".svg") ? latestSource.img : currentSource.img;
            const updates: DocumentUpdateData<this["item"]> = { img: updatedImage, data: latestSource.data };

            // Preserve precious material and runes
            if (currentSource.type === "weapon" || currentSource.type === "armor") {
                const materialAndRunes: Record<string, unknown> = {
                    "data.preciousMaterial": currentSource.data.preciousMaterial,
                    "data.preciousMaterialGrade": currentSource.data.preciousMaterialGrade,
                    "data.potencyRune": currentSource.data.potencyRune,
                    "data.propertyRune1": currentSource.data.propertyRune1,
                    "data.propertyRune2": currentSource.data.propertyRune2,
                    "data.propertyRune3": currentSource.data.propertyRune3,
                    "data.propertyRune4": currentSource.data.propertyRune4,
                };
                if (currentSource.type === "weapon") {
                    materialAndRunes["data.strikingRune"] = currentSource.data.strikingRune;
                } else {
                    materialAndRunes["data.resiliencyRune"] = currentSource.data.resiliencyRune;
                }
                mergeObject(updates, expandObject(materialAndRunes));
            }

            await this.item.update(updates, { diff: false, recursive: false });
            ui.notifications.info("The item has been refreshed.");
        } else {
            ui.notifications.error("The compendium item is of a different type than what is present on this actor");
        }
    }

    protected override _canDragDrop(_selector: string): boolean {
        return this.item.isOwner;
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        html.find('li.trait-item input[type="checkbox"]').on("click", (event) => {
            if (event.originalEvent instanceof MouseEvent) {
                this._onSubmit(event.originalEvent); // Trait Selector
            }
        });

        html.find(".trait-selector").on("click", (ev) => this.onTagSelector(ev));

        // Add Damage Roll
        html.find(".add-damage").on("click", (ev) => {
            this.addDamageRoll(ev);
        });

        // Remove Damage Roll
        html.find(".delete-damage").on("click", (ev) => {
            this.deleteDamageRoll(ev);
        });

        html.find(".add-rule-element").on("click", async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rulesData: Partial<RuleElementSource>[] = this.item.data.data.rules;
            this.item.update({
                "data.rules": rulesData.concat([{ key: "NewRuleElement" }]),
            });
        });
        html.find(".rules .remove-rule-element").on("click", async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rules = this.item.toObject().data.rules;
            const index = Number(event.currentTarget.dataset.ruleIndex ?? "NaN");
            if (rules && Number.isInteger(index) && rules.length > index) {
                rules.splice(index, 1);
                this.item.update({ "data.rules": rules });
            }
        });

        html.find(".add-skill-variant").on("click", (_event) => {
            if (!(this.item instanceof LorePF2e)) return;
            const variants = this.item.data.data.variants ?? {};
            const index = Object.keys(variants).length;
            this.item.update({
                [`data.variants.${index}`]: { label: "+X in terrain", options: "" },
            });
        });
        html.find(".skill-variants .remove-skill-variant").on("click", (event) => {
            const index = event.currentTarget.dataset.skillVariantIndex;
            this.item.update({ [`data.variants.-=${index}`]: null });
        });

        const $prerequisites = html.find<HTMLInputElement>('input[name="data.prerequisites.value"]');
        if ($prerequisites[0]) {
            new Tagify($prerequisites[0], {
                editTags: 1,
            });
        }

        InlineRollsLinks.listen(html);
    }

    protected override _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        // create the expanded update data object
        const fd = new FormDataExtended(this.form, { editors: this.editors });
        const data: Record<string, unknown> & { data?: { rules?: string[] } } = updateData
            ? mergeObject(fd.toObject(), updateData)
            : expandObject(fd.toObject());

        return flattenObject(data); // return the flattened submission data
    }

    /** Hide the sheet-config button unless there is more than one sheet option. */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const hasMultipleSheets = Object.keys(CONFIG.Item.sheetClasses[this.item.type]).length > 1;
        const sheetButton = buttons.find((button) => button.class === "configure-sheet");
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        // Convenenience utility for data entry; may make available to general users in the future
        if (BUILD_MODE === "development" && this.item.isOwned && this.item.sourceId?.startsWith("Compendium.")) {
            buttons.unshift({
                label: "Refresh",
                class: "refresh-from-compendium",
                icon: "fas fa-sync-alt",
                onclick: () => this.refreshItemFromCompendium(),
            });
        }
        return buttons;
    }

    /** Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error */
    protected override async _onSubmit(
        event: Event,
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        const $form = $<HTMLFormElement>(this.form);
        $form.find<HTMLInputElement>("tags ~ input").each((_i, input) => {
            if (input.value === "") {
                input.value = "[]";
            }
        });
        return super._onSubmit(event, { updateData, preventClose, preventRender });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Avoid setting a baseItem of an empty string
        if (formData["data.baseItem"] === "") {
            formData["data.baseItem"] = null;
        }

        // ensure all rules objects are parsed and saved as objects before proceeding to update
        try {
            const rules: object[] = [];
            Object.entries(formData)
                .filter(([key, _]) => key.startsWith("data.rules."))
                .forEach(([_, value]) => {
                    try {
                        rules.push(JSON.parse(value as string));
                    } catch (error) {
                        if (error instanceof Error) {
                            ui.notifications.error(`Syntax error in rule element definition: ${error.message}`);
                            console.warn("Syntax error in rule element definition.", error.message, value);
                            throw error;
                        }
                    }
                });
            formData["data.rules"] = rules;
        } catch (e) {
            return;
        }

        super._updateObject(event, formData);
    }
}
